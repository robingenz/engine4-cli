# engine4-cli

[![Build](https://img.shields.io/github/actions/workflow/status/robingenz/engine4-cli/ci.yml?branch=main)](https://github.com/robingenz/engine4-cli/actions?query=workflow%3A%22CI%22)
[![License](https://img.shields.io/npm/l/engine4)](https://github.com/robingenz/engine4-cli/blob/main/LICENSE)
[![npm (version)](https://img.shields.io/npm/v/engine4)](https://www.npmjs.com/package/engine4)
[![npm (downloads)](https://img.shields.io/npm/dm/engine4)](https://www.npmjs.com/package/engine4)

⚙️ Command-line interface for the ENGINE4 API.

Built on [engine4-node](https://github.com/robingenz/engine4-node) and [zodline](https://zodline.dev/).

## Installation

Use [npm](https://docs.npmjs.com/cli/) to install the package:

```bash
npm install -g engine4
```

Or run it without installing:

```bash
npx engine4 --help
```

Requires Node.js 22.12 or later.

## Authentication

Log in once. The CLI asks for the base URL, the client ID and either a username and password or a client secret:

```bash
engine4 login
```

You can also pass everything as flags:

```bash
engine4 login --base-url https://test.engine4.io --client-id my_client_id --username my_username --password my_password
engine4 login --base-url https://test.engine4.io --client-id my_client_id --client-secret my_client_secret
```

The credentials and the current access token are stored in `$XDG_CONFIG_HOME/engine4/config.json` (default `~/.config/engine4/config.json`, `%APPDATA%\engine4\config.json` on Windows). The file is only readable by you. The token is renewed automatically when it expires. Run `engine4 logout` to delete the file.

### CI

In CI, set environment variables instead of logging in. They take precedence over the config file:

| Variable                | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `ENGINE4_BASE_URL`      | Base URL of the ENGINE4 server. Required.       |
| `ENGINE4_CLIENT_ID`     | Client ID.                                      |
| `ENGINE4_CLIENT_SECRET` | Client secret, for client credentials.          |
| `ENGINE4_USERNAME`      | Username, for the password grant.               |
| `ENGINE4_PASSWORD`      | Password, for the password grant.               |
| `ENGINE4_ACCESS_TOKEN`  | An existing access token. Skips authentication. |

## Usage

Every command accepts `--json` to print the result as JSON. Run `engine4 <command> --help` to see all options.

```bash
# Metadata
engine4 entity list
engine4 property list --entity 1234
engine4 view list --entity 1234
engine4 view-field list --view 5678

# Records
engine4 record fetch --entity 1234 --take 10
engine4 record fetch --entity 1234 --filter '{"genericName":"Custom_001","compareOperator":"=","value":"foo"}'
engine4 record fetch --entity 1234 --sort Custom_002:desc --active true --json
engine4 record get --entity 1234 --data-id abcd
engine4 record save --entity 1234 --set Custom_001=foo --set Custom_002=bar
engine4 record save --entity 1234 --data-id abcd --set Custom_001=baz
engine4 record save --entity 1234 --file records.json --return full
engine4 record delete --entity 1234 --data-id abcd --yes

# Files
engine4 attachment fetch --data-id abcd --output ./downloads
engine4 attachment save --parent-entity 1234 --parent-data-id abcd --file ./invoice.pdf
engine4 document fetch --entity 1234 --data-id abcd --column Custom_010
engine4 document save --entity 1234 --data-id abcd --column Custom_010 --file ./photo.jpg
```

### Filters

`--filter` takes the filter as JSON. A filter is either a condition or a group of filters:

```json
{
  "logic": "AND",
  "groups": [
    { "genericName": "Custom_001", "compareOperator": "=", "value": "foo" },
    { "genericName": "Custom_002", "compareOperator": "IN", "value": ["a", "b"] },
    { "genericName": "Custom_003", "compareOperator": "ISNOTNULL" }
  ]
}
```

Supported operators: `=`, `!=`, `<`, `>`, `<=`, `>=`, `LIKE`, `CONTAINS`, `ISNULL`, `ISNOTNULL`, `IN`.

## Output and exit codes

Results are printed to stdout. Prompts, progress and errors go to stderr. With `--json`, stdout contains exactly one JSON document and the CLI never prompts.

| Exit code | Meaning                                                                 |
| --------- | ----------------------------------------------------------------------- |
| `0`       | Success                                                                 |
| `1`       | The command failed, for example an API error or a declined confirmation |
| `2`       | Invalid usage, for example a missing or invalid flag                    |
| `3`       | Not logged in, or the access token was rejected                         |

Errors are printed as one line in the form `E_CODE message`. Colors are disabled when stdout is not a terminal or when `NO_COLOR` is set.

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

## Changelog

See [CHANGELOG.md](https://github.com/robingenz/engine4-cli/blob/main/CHANGELOG.md).

## License

See [LICENSE](https://github.com/robingenz/engine4-cli/blob/main/LICENSE).
