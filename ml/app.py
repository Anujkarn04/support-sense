
"""SupportSense: ML-only sentiment and escalation demo."""

import pandas as pd
import streamlit as st

from src.pipeline.live_inference import predict_conversation


st.set_page_config(
    page_title="SupportSense | ML Demo",
    page_icon="🧠",
    layout="wide",
)

st.title("🧠 SupportSense")
st.subheader("Customer Sentiment & Escalation Prediction")
st.caption(
    "ML demonstration using existing trained models. "
    "Escalation predictions are experimental."
)

st.info(
    "Enter five chronological messages from a customer-support conversation. "
    "The app predicts each message's sentiment and estimates escalation risk "
    "at the five-message checkpoint."
)

if "demo_messages" not in st.session_state:
    st.session_state.demo_messages = [
        {
            "role": "Customer",
            "text": "My product stopped working after two days.",
        },
        {
            "role": "Support Agent",
            "text": "I'm sorry about that. Could you share your order number?",
        },
        {
            "role": "Customer",
            "text": "I already shared it, and nobody has helped me.",
        },
        {
            "role": "Support Agent",
            "text": "I understand your frustration. Let me check your order.",
        },
        {
            "role": "Customer",
            "text": "This is unacceptable. I want this issue resolved immediately.",
        },
    ]

st.markdown("### 1. Enter the conversation")

st.caption(
    "The example is editable. Messages are processed in the order shown."
)

with st.form("conversation_form"):
    edited_messages = []

    for index, message in enumerate(st.session_state.demo_messages):
        st.markdown(f"**Message {index + 1}**")

        role = st.selectbox(
            f"Speaker — message {index + 1}",
            options=["Customer", "Support Agent"],
            index=(
                0 if message["role"] == "Customer" else 1
            ),
            key=f"role_{index}",
        )

        text = st.text_area(
            f"Message text — message {index + 1}",
            value=message["text"],
            key=f"text_{index}",
            height=80,
        )

        edited_messages.append({"role": role, "text": text})

    submitted = st.form_submit_button(
        "Run ML Prediction",
        type="primary",
        use_container_width=True,
    )

if submitted:
    if any(not item["text"].strip() for item in edited_messages):
        st.error("Please fill in all five messages.")
    else:
        inbound_values = [
            item["role"] == "Customer" for item in edited_messages
        ]

        messages = pd.DataFrame(
            {
                "tweet_id": list(range(1, 6)),
                "inbound": inbound_values,
                "created_at": pd.date_range(
                    "2026-01-01 10:00:00",
                    periods=5,
                    freq="5min",
                    tz="UTC",
                ),
                "text": [item["text"].strip() for item in edited_messages],
            }
        )

        try:
            with st.spinner("Running the sentiment and escalation models..."):
                result = predict_conversation(messages)

            st.session_state["prediction_result"] = result
            st.session_state["submitted_messages"] = edited_messages

        except Exception as exc:
            st.error(f"Prediction failed: {type(exc).__name__}: {exc}")

result = st.session_state.get("prediction_result")

if result:
    st.divider()
    st.markdown("### 2. Message-level sentiment predictions")

    sentiment_rows = []

    for item in result["sentiment_predictions"]:
        sentiment_rows.append(
            {
                "Message ID": item["tweet_id"],
                "Speaker": item["role"].title(),
                "Sentiment": item["sentiment"].title(),
                "Negative probability": (
                    f"{item['negative_probability']:.1%}"
                ),
                "Positive probability": (
                    f"{item['positive_probability']:.1%}"
                ),
            }
        )

    st.dataframe(
        pd.DataFrame(sentiment_rows),
        use_container_width=True,
        hide_index=True,
    )

    escalation = result["escalation"]
    risk = float(escalation["escalation_risk"])
    alert = bool(escalation["alert_recommended"])

    st.markdown("### 3. Escalation prediction")

    col1, col2, col3 = st.columns(3)

    col1.metric("Escalation risk score", f"{risk:.1%}")
    col2.metric(
        "Alert threshold",
        f"{escalation['experimental_threshold']:.0%}",
    )
    col3.metric("Messages processed", result["messages_processed"])

    st.progress(max(0.0, min(1.0, risk)))

    
    if alert:
        st.error(
            "🚨 HIGH RISK — Supervisor review recommended",
            icon="🚨",
        )
    else:
        st.success(
            "✅ BELOW ALERT THRESHOLD — No alert recommended",
            icon="✅",
        )


    st.caption(
        "The risk score is an experimental model estimate, not a calibrated "
        "probability or a guarantee that escalation will occur."
    )

    st.markdown("### 4. Model limitations")

    for warning in result["warnings"]:
        st.write(f"- {warning}")

    st.caption(
        "This demo uses five chronological messages and synthetic timestamps. "
        "It demonstrates model inference, not a live support-system integration."
    )
