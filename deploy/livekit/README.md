# Dena managed video infrastructure

The application uses LiveKit as an open-source media server hosted and operated
by Dena. It does not require LiveKit Cloud or a third-party call API. This
repository contains the integration; the media server belongs on a dedicated
Dena-managed VM/network, separate from the Next.js app.

## Provisioning

1. Allocate a public VM for Stage and a separate one for Production. Give each
   environment its own API key, API secret, and DNS names. Do not reuse keys.
2. Create DNS A/AAAA records for the primary call hostname and TURN hostname,
   both pointing to that VM. Keep the app's `LIVEKIT_URL` set to the secure
   primary hostname, for example `wss://calls.stage.example.org`.
3. On a secured operator workstation, use LiveKit's official VM config
   generator. It produces Docker Compose, LiveKit, Caddy/TLS, and Redis
   configuration tailored to the DNS names:

   ```sh
   mkdir -p livekit-stage && cd livekit-stage
   docker pull livekit/generate
   docker run --rm -it -v "$PWD:/output" livekit/generate
   ```

   Review the generated files, restrict their permissions, and transfer them
   to the Dena VM. Keep the generated API secret out of git and CI logs.
4. Open only the LiveKit VM firewall ports required by the deployment:
   TCP 80/443 for certificate issuance and HTTPS/TURN-TLS, TCP 7881 for
   WebRTC-over-TCP, UDP 3478 for TURN, and UDP 50000-60000 for WebRTC media.
   Redis must remain private to the LiveKit deployment. Do not expose port 7880
   directly to the public internet; put signaling behind the generated TLS
   proxy.
5. Start the generated Compose stack and verify its health and TLS certificate.
   Set the matching `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` in the Dena app's
   secret store, then set `LIVEKIT_URL` and `DENA_LIVEKIT_ENABLED=1`. The app
   process must be able to reach the server's HTTPS API as well as browsers
   reaching the public WSS/media endpoints.
6. Configure the LiveKit webhook destination as
   `https://<dena-app-host>/api/webhooks/livekit` with the same environment's
   API key. Subscribe to `participant_joined`, `participant_left`,
   `participant_connection_aborted`, and `room_finished`. LiveKit signs the raw
   JSON body; Dena verifies the signature and persists provider event IDs to
   make retries idempotent. Keep the webhook endpoint on TLS and do not put
   webhook credentials in client code.
7. Run the separate Dena app worker with
   `DENA_LIVEKIT_QUOTA_SWEEP_URL=https://<internal-app-host>/api/internal/livekit-quota/sweep`
   and a unique random `DENA_LIVEKIT_QUOTA_WORKER_TOKEN` (at least 32
   characters). Start it with `npm run worker:livekit-quota`. It checks active
   overlap every second and closes the room automatically when its remaining
   paid seconds are used. Keep the worker URL on the private app network.
8. Before enabling Stage for users, test two authorized accounts from separate
   networks: camera/microphone permission, both-way audio/video, reconnect,
   end-call disconnection, denied role/quota/consent, TLS, UDP and TURN/TLS
   fallback. Do not enable Production until the same checks and an operational
   recovery exercise pass there.

LiveKit's official VM deployment guide and generator are the source of truth
for the generated version-specific configuration. Record the chosen server
image version and config checksum in the deployment change. Upgrade Stage
first, repeat the network tests, then promote the same pinned version.

## Application behavior

- A join token is room-scoped, issued only after Dena's server rechecks access,
  and expires after one hour. Expiry is an authentication lifetime; it is not
  a meeting duration or an automatic five-minute disconnect.
- Ending a started call records the Dena lifecycle state and asks the
  self-hosted Room Service to delete its room, which disconnects connected
  participants. If the media API is temporarily unavailable, the app returns
  an error and retrying the end action retries media shutdown.
- Quota grants are stored in seconds (purchased whole minutes convert to
  seconds exactly). LiveKit presence webhooks add usage only for intervals when
  the student and at least one active institute member overlap. Usage is stored
  without minute rounding and finalized when the LiveKit room finishes. The
  quota worker ends the room when paid time is depleted; the measured usage
  remains the actual whole seconds reported by LiveKit.
- No recording, egress, screen sharing, or third-party call provider is enabled
  by this setup.

This is deployment preparation, not a claim that a Dena VM, DNS, TLS, firewall,
or Stage network test has already been provisioned.
