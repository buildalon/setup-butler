# setup-butler

[![Discord](https://img.shields.io/discord/939721153688264824.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://discord.gg/VM9cWJ9rjH) [![marketplace](https://img.shields.io/static/v1?label=&labelColor=505050&message=Buildalon%20Actions&color=FF1E6F&logo=github-actions&logoColor=0076D6)](https://github.com/marketplace?query=buildalon) [![validate](https://github.com/buildalon/setup-butler/actions/workflows/validate.yml/badge.svg?branch=main)](https://github.com/buildalon/setup-butler/actions/workflows/validate.yml)

A Github Action to setup the [butler](https://github.com/itchio/butler) command line tools for itch.io content authoring.

## How to use

### workflow

```yaml
jobs:
  validate:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    steps:
      # download and setup butler
      - uses: buildalon/setup-butler@v1
        with:
          api-key: ${{ secrets.BUTLER_API_KEY }}
      # run butler commands
      - name: Upload to itch.io
        # https://itch.io/docs/butler/pushing.html
        run: butler push directory user/game:channel
        env:
          BUTLER_API_KEY: ${{ secrets.BUTLER_API_KEY }}
```

### inputs

| name | description | required |
| ---- | ----------- | -------- |
| `api-key` | An [api key for your itch.io account](https://itch.io/user/settings/api-keys) | true |
| `version` | The version of butler to install. Defaults to `latest`. | false |
| `self-update` | Update butler to the latest version. Defaults to `true`. | false |

### outputs

### environment variables

- `BUTLER_PATH`: The `butler` directory location.
- `BUTLER_DIR`: The directory where butler is installed.
