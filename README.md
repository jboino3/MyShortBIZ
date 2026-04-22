# MyShortBIZ

MyShortBIZ uses a React/Vite frontend with a FastAPI backend. The current dev workflow starts all three long-running services together:

- web app on `http://localhost:5173`
- API on `http://127.0.0.1:8000`
- local voice daemon on `http://127.0.0.1:8011`

This repo assumes `npm run dev` is the primary local startup path for the full application stack during development.

Run:

```bash
npm install
npm run dev
```

## Telephony: Vapi Inbound Integration

This project now includes a production-style Vapi inbound layer under the existing FastAPI app.

### Endpoints

- `GET /telephony/vapi/health`
- `POST /telephony/vapi/assistant-request`
- `POST /telephony/vapi/events`
- `POST /telephony/vapi/voice`

### Supported modes

- `TELEPHONY_MODE=direct`
  Vapi number uses `serverUrl` to call `/telephony/vapi/assistant-request`, and the backend returns either a configured `assistantId` or a transient assistant that uses:
  - your current thesis/business configuration
  - Vapi model + transcriber settings from env
  - the existing local voice daemon path through `/telephony/vapi/voice`

- `TELEPHONY_MODE=sip-transfer`
  Vapi number can be patched with a `call.ringing` hook that transfers the call to `VAPI_SIP_URI`.

### Environment variables

Copy [.env.example](/home/anya/MyShortBIZ/.env.example) into your server environment and set:

- `PUBLIC_BASE_URL`
- `TELEPHONY_MODE`
- `VAPI_API_KEY`
- `VAPI_PHONE_NUMBER_ID`
- `VAPI_ASSISTANT_ID` if you want to reuse a saved assistant
- `VAPI_END_OF_TURN_SECONDS` to control how much silence ends the caller turn in direct mode
- `VAPI_FALLBACK_VOICE_PROVIDER` and `VAPI_FALLBACK_VOICE_ID` to keep calls alive if custom voice generation fails
- `VAPI_SERVER_CREDENTIAL_ID` and/or `VAPI_WEBHOOK_SECRET` for webhook auth
- `VAPI_SIP_URI` only for SIP mode

The voice path still uses:

- `THESIS_VOICE_DAEMON_MODE=true`
- `THESIS_VOICE_DAEMON_URL=http://127.0.0.1:8011`

### Local development with a public tunnel

Vapi must reach your backend over public HTTPS. For local development:

1. Start the project with `npm run dev`.
2. Expose port `8000` with a tunnel such as `ngrok http 8000` or a Cloudflare tunnel.
3. Set `PUBLIC_BASE_URL` to the public HTTPS URL from that tunnel.
4. Restart the API if you changed env vars after startup.

### Direct mode setup

1. Create a free US number in the Vapi dashboard.
2. Set `TELEPHONY_MODE=direct`.
3. Set `PUBLIC_BASE_URL` to your public backend URL.
4. Set `VAPI_PHONE_NUMBER_ID` to the Vapi phone number ID.
   Current thesis value: `8cbe5bec-7efe-4512-bd96-4933dc906bed`
5. Set `VAPI_END_OF_TURN_SECONDS=1.0` if you want the assistant to answer after about one second of silence.
6. Optionally set `VAPI_ASSISTANT_ID` and `VAPI_USE_SAVED_ASSISTANT=true` if you want a saved assistant instead of transient assistant responses.
7. Patch the number so its `serverUrl` points at this backend:

```bash
python3 scripts/configure_vapi_number.py --mode direct --show-current
```

The script uses:
- `VAPI_API_KEY`
- `VAPI_PHONE_NUMBER_ID`
- `PUBLIC_BASE_URL`
- `VAPI_SERVER_CREDENTIAL_ID` if set

Current thesis inbound number:
- `+1 878-251-9238`

### SIP transfer mode setup

1. Set `TELEPHONY_MODE=sip-transfer`.
2. Set `VAPI_PHONE_NUMBER_ID`.
3. Set `VAPI_SIP_URI`.
4. Apply the hook:

```bash
python3 scripts/configure_vapi_number.py --mode sip-transfer --show-current
```

This patches the Vapi number with a `call.ringing` hook that transfers to the configured SIP URI.

### Testing

Health:

```bash
curl http://127.0.0.1:8000/telephony/vapi/health
```

Assistant request:

```bash
curl -X POST http://127.0.0.1:8000/telephony/vapi/assistant-request \
  -H 'Content-Type: application/json' \
  -d '{
    "message": {
      "type": "assistant-request",
      "call": {
        "id": "test-call-001",
        "phoneNumberId": "pn_test",
        "phoneNumber": { "number": "+14806724297" },
        "customer": { "number": "+16025550123" }
      }
    }
  }'
```

If a thesis voice clone exists for the selected thesis project, the returned assistant uses the custom voice server at `/telephony/vapi/voice`.

### Call forwarding from a regular number

Carrier or app-based call forwarding is configured outside this codebase. The supported production path is:

1. Obtain a Vapi number.
2. Point the Vapi number at this backend in direct mode, or configure SIP transfer mode.
3. Forward your regular number to the Vapi number from the carrier or calling app settings.

### Notes

- `assistant-request` is intentionally fast and does not warm models or synthesize audio inline.
- The local voice daemon remains the primary synthesis backend.
- Webhook verification supports a bearer token or shared secret header today and is structured so stronger verification can be added later.
- Add the final production frontend origin to the backend CORS policy before deployment.
