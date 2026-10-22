import "dotenv/config";
import { emailSettings, createEmailTransport } from "./email.js";

let settings;
try {
  settings = emailSettings();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
if (settings) {
  const transport = createEmailTransport(settings);
  try {
    await transport.verify();
    console.log(
      "Email server connection and authentication passed. No email was sent. Sender acceptance and inbox delivery still require an actual owner approval notification.",
    );
  } catch (error) {
    console.error(
      `Email connection failed (${error.code || "SMTP_ERROR"}). Check the provider, port and credentials in your private .env file.`,
    );
    process.exitCode = 1;
  } finally {
    transport.close();
  }
}
