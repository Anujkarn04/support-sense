# API contract the frontend expects
All JSON. Auth: `Authorization: Bearer <token>`. List endpoints return `{items, total}` unless noted. Times are ISO-8601 UTC. Risk is 0-1 on the wire (UI shows 0-100). Customers must never receive ML fields (sentiment, risk, prediction, trajectory, trend, alerts, checkpoint).

- `GET /health`
- `POST /auth/login {email,password}` -> `{access_token, user}`; `POST /auth/register`; `GET /auth/me`
- `GET /config/risk` -> `{bands:{medium_min,high_min,critical_min,alert_min}, trend, categories, teams, ml:{is_mock,...}, escalation_definition}`
- `GET/POST /config/alert-thresholds` (POST admin only; appends a version; GET -> `{current, history}`)
- `GET/POST /conversations`; `GET/PATCH /conversations/:id`; `POST /conversations/:id/close`
  - internal summaries add: `customer, trajectory[]` (last 12 negative probabilities), `trend, checkpoint{needed,seen,reached}, prediction, open_alert, sentiment_latest, actual_outcome`
- `GET/POST /conversations/:id/messages` (internal messages add `sentiment, negative_probability, positive_probability`)
- `GET /conversations/:id/predictions`
- `GET /alerts`; `PATCH /alerts/:id {action:"acknowledge"|"resolve"}`
- `GET /outcomes`; `POST /outcomes/:id/validate {outcome}`
- `GET /dashboard/summary | /sentiment?group_by=team | /escalations?basis | /risk-distribution | /response-time`; `GET /dashboard/agents | /teams` return `{items}`; `/dashboard/escalations` has `by_time` and `by_category`
- `GET /analytics/sentiment-trajectory/:id`; `GET /analytics/threshold-simulation` (returns `status:"insufficient_data"` under 30 validated outcomes); `GET /analytics/alert-effectiveness`
- `GET /models`; `GET /admin/users`; `GET /admin/export/training` -> `{filename, text, count}`
- WebSocket `/ws`: first frame `{type:"auth", token}`; events NEW_ALERT, ALERT_UPDATED, MESSAGE, CONVERSATION_UPDATED, PREDICTION, OUTCOME_UPDATED, filtered per role.

Exact response shapes: `src/mock/router.js` and `src/mock/views.js` implement every endpoint above.
