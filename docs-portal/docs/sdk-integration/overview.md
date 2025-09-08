# SDK Integration Overview

The SaaS Framework ships with lightweight SDKs that simplify communicating with the platform
services. The guides in this section show how to install the packages, configure them with your
tenant credentials, and call common APIs from both Node.js and browser environments.

Each module's SDK follows the same pattern:

1. Install the package from npm.
2. Instantiate the client with your tenant's API key and base URL.
3. Call methods that map directly to the platform's REST APIs.
