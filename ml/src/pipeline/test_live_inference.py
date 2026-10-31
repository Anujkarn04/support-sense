
import pandas as pd
import pytest

from src.pipeline.live_inference import predict_conversation


def sample_messages():
    return pd.DataFrame([
        {
            "tweet_id": 900001,
            "inbound": True,
            "created_at": "2026-10-29T10:00:00Z",
            "text": "My order has still not arrived. This is very frustrating.",
        },
        {
            "tweet_id": 900002,
            "inbound": False,
            "created_at": "2026-10-29T10:02:00Z",
            "text": "I'm sorry about the delay. Let me check your order.",
        },
        {
            "tweet_id": 900003,
            "inbound": True,
            "created_at": "2026-10-29T10:04:00Z",
            "text": "I contacted support several times and nobody fixed this.",
        },
        {
            "tweet_id": 900004,
            "inbound": False,
            "created_at": "2026-10-29T10:05:00Z",
            "text": "I understand. I'll investigate this for you.",
        },
        {
            "tweet_id": 900005,
            "inbound": True,
            "created_at": "2026-10-29T10:07:00Z",
            "text": "This is unacceptable. I want a supervisor.",
        },
    ])


def test_predict_conversation_returns_complete_output():
    result = predict_conversation(sample_messages())

    assert result["status"] == "experimental_prediction"
    assert result["messages_processed"] == 5
    assert result["checkpoint_reached"] is True
    assert len(result["sentiment_predictions"]) == 5

    for prediction in result["sentiment_predictions"]:
        assert prediction["sentiment"] in {"negative", "positive"}
        assert 0.0 <= prediction["negative_probability"] <= 1.0
        assert 0.0 <= prediction["positive_probability"] <= 1.0

    escalation = result["escalation"]
    assert isinstance(escalation["escalation_risk"], (int, float))
    assert 0.0 <= escalation["escalation_risk"] <= 1.0
    assert isinstance(escalation["alert_recommended"], bool)
    assert result["warnings"]


def test_predict_conversation_rejects_fewer_than_five_messages():
    with pytest.raises(ValueError, match="At least five messages"):
        predict_conversation(sample_messages().iloc[:4])


def test_predict_conversation_rejects_duplicate_ids():
    messages = sample_messages()
    messages.loc[1, "tweet_id"] = messages.loc[0, "tweet_id"]

    with pytest.raises(ValueError, match="Duplicate tweet_id"):
        predict_conversation(messages)
