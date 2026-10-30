
import pytest

from src.sentiment.predict import predict_sentiment


def test_predict_sentiment_returns_valid_output():
    result = predict_sentiment(
        "My order is delayed and I am very frustrated."
    )

    assert result["sentiment"] in {"negative", "positive"}
    assert result["sentiment_label"] in {0, 1}
    assert 0.0 <= result["negative_probability"] <= 1.0
    assert 0.0 <= result["positive_probability"] <= 1.0
    assert abs(
        result["negative_probability"]
        + result["positive_probability"]
        - 1.0
    ) < 1e-6
    assert result["model_version"] == "sst2-tfidf-logistic-regression"
    assert result["warning"]


def test_predict_sentiment_rejects_empty_text():
    with pytest.raises(ValueError):
        predict_sentiment("")
