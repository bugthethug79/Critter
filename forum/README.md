# Critter Forums

Runs [NodeBB](https://nodebb.org) on bot-hosting.net using a Node.js application and a MongoDB database. `index.js` downloads NodeBB, sets it up on the first start, and runs it after that. It has no dependencies of its own.

## Set up on bot-hosting.net

1. **Database → New database → MongoDB.** Note the connection details it gives you.
2. **Application.** Point it at the Git repository that holds this folder's files at its root, and pick the **Node.js** runtime at version **22 or newer**. Turn **off** "Pull automatically at every restart", so the forum only changes when you decide. Use `index.js` as the main file (or `npm start`).
3. **Environment variables.** Mark the passwords as secret.

   | Variable | Value |
   | --- | --- |
   | `FORUM_URL` | The forum's public address, e.g. `https://forums.example.com` |
   | `ADMIN_USERNAME` | Your admin username |
   | `ADMIN_EMAIL` | Your admin email |
   | `ADMIN_PASSWORD` | Your admin password (only needed for the first start) |
   | `MONGO_URI` | The full MongoDB connection string, **or** use the four below |
   | `MONGO_HOST`, `MONGO_PORT`, `MONGO_USERNAME`, `MONGO_PASSWORD`, `MONGO_DATABASE` | The MongoDB details, if the panel gives them separately |

   The port is taken from `SERVER_PORT` or `PORT` (whichever the panel sets), falling back to `4567`.
4. **Start the app.** The first start takes several minutes: it downloads NodeBB, installs packages and builds the front end. That build needs about **1 GB of RAM**. When the log says `Setup complete`, delete `ADMIN_PASSWORD` from the variables.
5. **Domain.** Attach your forum domain to the application, then set `FORUM_URL` in `assets/js/main.js` on the main site so the Forums page links to it.

## Updating NodeBB

Set `NODEBB_REF` to a newer release tag, such as `v4.17.0`, and restart. The launcher fetches that version, keeps `config.json` and uploaded files, and runs NodeBB's upgrade.

## Email

NodeBB sends sign-up confirmations and password resets by email. Until there's an email service, turn off the requirement for new users to confirm their email address in NodeBB's admin settings (under Email and User). When you have a sending service, enter its SMTP details on the Email settings page.
