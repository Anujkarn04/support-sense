
"""End-to-end experimental SupportSense inference pipeline."""

from datetime import timezone

import numpy as np
import pandas as pd

from src.sentiment.predict import (
    load_sentiment_models,
    predict_sentiment,
)
from src.escalation.inference import (
    load_model as load_escalation_model,
    predict_escalation,
)


CHECKPOINT_MESSAGES = 5

NUMERIC_FEATURES = [
    "messages_seen",
    "customer_message_count",
    "support_message_count",
    "customer_negative_message_count",
    "customer_negative_ratio",
    "customer_average_negative_probability",
    "latest_customer_negative_probability",
    "customer_sentiment_slope",
    "average_support_response_delay_seconds",
    "max_support_response_delay_seconds",
    "elapsed_seconds",
    "current_message_is_customer",
]


def _parse_time(value):
    timestamp = pd.Timestamp(value)

    if pd.isna(timestamp):
        raise ValueError("Message created_at must be a valid timestamp.")

    if timestamp.tzinfo is None:
        timestamp = timestamp.tz_localize("UTC")

    return timestamp.tz_convert("UTC")


def _validate_messages(messages):
    required = {"tweet_id", "inbound", "created_at", "text"}
    missing = required - set(messages.columns)

    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")

    if len(messages) < CHECKPOINT_MESSAGES:
        raise ValueError(
            "At least five messages are required for escalation prediction."
        )

    if messages["tweet_id"].duplicated().any():
        raise ValueError("Duplicate tweet_id values found.")

    if messages["text"].isna().any():
        raise ValueError("Message text cannot be missing.")

    if not messages["inbound"].isin([True, False, 0, 1]).all():
        raise ValueError("inbound must contain boolean or 0/1 values.")


def _build_snapshot(messages, sentiment_results):
    """Build features using only messages in the supplied checkpoint."""
    customer_probs = []
    customer_flags = []
    support_delays = []

    customer_count = 0
    support_count = 0
    previous_time = None
    first_time = messages[0]["created_at"]

    for message, sentiment in zip(messages, sentiment_results):
        current_time = message["created_at"]
        is_customer = bool(message["inbound"])

        if is_customer:
            customer_count += 1
            customer_probs.append(sentiment["negative_probability"])
            customer_flags.append(sentiment["sentiment_label"] == 0)
        else:
            support_count += 1

            if previous_time is not None:
                delay = (current_time - previous_time).total_seconds()
                if delay >= 0:
                    support_delays.append(delay)

        previous_time = current_time

    probs = np.asarray(customer_probs, dtype=float)

    slope = (
        float(np.polyfit(np.arange(len(probs)), probs, 1)[0])
        if len(probs) >= 2
        else 0.0
    )

    last_message = messages[-1]

    features = {
        "messages_seen": len(messages),
        "customer_message_count": customer_count,
        "support_message_count": support_count,
        "customer_negative_message_count": int(sum(customer_flags)),
        "customer_negative_ratio": (
            float(np.mean(customer_flags)) if customer_flags else np.nan
        ),
        "customer_average_negative_probability": (
            float(np.mean(probs)) if len(probs) else np.nan
        ),
        "latest_customer_negative_probability": (
            float(probs[-1]) if len(probs) else np.nan
        ),
        "customer_sentiment_slope": slope,
        "average_support_response_delay_seconds": (
            float(np.mean(support_delays)) if support_delays else np.nan
        ),
        "max_support_response_delay_seconds": (
            float(np.max(support_delays)) if support_delays else np.nan
        ),
        "elapsed_seconds": (
            last_message["created_at"] - first_time
        ).total_seconds(),
        "current_message_is_customer": bool(last_message["inbound"]),
    }

    return features


def predict_conversation(messages):
    """
    Predict sentiment for each message and eventual escalation risk at
    the first five-message checkpoint.

    messages: DataFrame containing tweet_id, inbound, created_at, text.
    """
    if not isinstance(messages, pd.DataFrame):
        raise TypeError("messages must be a pandas DataFrame.")

    if messages.empty:
        raise ValueError("messages cannot be empty.")

    messages = messages.copy()
    _validate_messages(messages)

    messages["created_at"] = messages["created_at"].map(_parse_time)
    messages = messages.sort_values(
        ["created_at", "tweet_id"]
    ).reset_index(drop=True)

    # Use the same sentiment and escalation artifacts as the existing code.
    sentiment_model, vectorizer = load_sentiment_models()
    escalation_artifact = load_escalation_model()

    # Only the first five messages are available at this checkpoint.
    checkpoint = messages.iloc[:CHECKPOINT_MESSAGES]
    message_records = checkpoint.to_dict("records")

    sentiment_results = []

    for message in message_records:
        result = predict_sentiment(
            str(message["text"]),
            model=sentiment_model,
            vectorizer=vectorizer,
        )
        sentiment_results.append(result)

    # Match the training convention: concatenate customer text only,
    # preserving chronological order, through the fifth total message.
    customer_text = " ".join(
        str(message["text"]).strip()
        for message in message_records
        if bool(message["inbound"]) and str(message["text"]).strip()
    )

    if not customer_text.strip():
        raise ValueError(
            "No customer messages are available in the five-message checkpoint."
        )

    features = _build_snapshot(message_records, sentiment_results)

    escalation_result = predict_escalation(
        customer_text=customer_text,
        features=features,
        artifact=escalation_artifact,
    )

    return {
        "status": "experimental_prediction",
        "messages_processed": len(message_records),
        "checkpoint_reached": True,
        "sentiment_predictions": [
            {
                "tweet_id": message["tweet_id"],
                "role": "customer" if bool(message["inbound"]) else "support",
                **sentiment,
            }
            for message, sentiment in zip(
                message_records, sentiment_results
            )
        ],
        "escalation": escalation_result,
        "warnings": [
            "Sentiment model uses general-domain training data.",
            "Escalation model is experimental and not production-validated.",
            "The output predicts eventual conversation outcome, not escalation onset.",
            "Only the first five chronological messages were used.",
        ],
    }
