import { getAgent } from "./agent"
import qrcode from "qrcode-terminal"
import { Agent, ConnectionEventTypes, ConnectionStateChangedEvent } from "@aries-framework/core"

const run = async () => {
  const agent = await getAgent("hyperledger-issuer-demo")

  const schema = await agent.ledger.registerSchema({
    attributes: ["name", "age"],
    name: "hl-issuer-demo-schema",
    version: "1.0",
  })

  const credentialDefinition = await agent.ledger.registerCredentialDefinition({
    schema,
    supportRevocation: false,
    tag: "default",
  })

  const { outOfBandRecord, invitation } = await agent.oob.createLegacyInvitation()

  const url = invitation.toUrl({ domain: "https://example.org" })

  qrcode.generate(url)

  const connectionId = await connectionListener(agent, outOfBandRecord.id)

  await agent.credentials.offerCredential({
    connectionId,
    protocolVersion: "v1",
    credentialFormats: {
      indy: {
        credentialDefinitionId: credentialDefinition.id,
        attributes: [
          { name: "name", value: "Berend" },
          { name: "age", value: "23" },
        ],
      },
    },
  })
}

const connectionListener = (agent: Agent, id: string): Promise<string> => {
  return new Promise((resolve) => {
    agent.events.on<ConnectionStateChangedEvent>(ConnectionEventTypes.ConnectionStateChanged, ({ payload }) => {
      if (payload.connectionRecord.outOfBandId !== id) return
      if (payload.connectionRecord.isReady) {
        resolve(payload.connectionRecord.id)
      }
    })
  })
}

void run()
