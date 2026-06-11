#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -z "${JAVA_HOME:-}" && -d "/usr/lib/jvm/java-21-openjdk-amd64" ]]; then
  export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
fi

if [[ -z "${ANDROID_HOME:-}" && -d "/usr/lib/android-sdk" ]]; then
  export ANDROID_HOME="/usr/lib/android-sdk"
fi

if [[ -z "${ANDROID_SDK_ROOT:-}" && -n "${ANDROID_HOME:-}" ]]; then
  export ANDROID_SDK_ROOT="${ANDROID_HOME}"
fi

if [[ -z "${ANDROID_HOME:-}" || ! -d "${ANDROID_HOME}" ]]; then
  echo "ANDROID_HOME nao configurado. Defina o SDK Android antes do build." >&2
  exit 1
fi

if [[ -n "${JAVA_HOME:-}" && -d "${JAVA_HOME}" ]]; then
  export PATH="${JAVA_HOME}/bin:${PATH}"
fi

export PATH="${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/cmdline-tools/latest/bin:${PATH}"

# Debian instala um wrapper de gradle em /bin que falha neste ambiente.
# Preferimos o script real se ele existir.
if [[ -x "/usr/share/gradle/bin/gradle" ]]; then
  TEMP_BIN="$(mktemp -d)"
  trap 'rm -rf "${TEMP_BIN}"' EXIT
  cat > "${TEMP_BIN}/gradle" <<'EOF'
#!/bin/sh
exec /usr/share/gradle/bin/gradle "$@"
EOF
  chmod +x "${TEMP_BIN}/gradle"
  export PATH="${TEMP_BIN}:${PATH}"
fi

cd "${ROOT_DIR}"
node ./build/build.mjs

if [[ -f "${ROOT_DIR}/cordova/build-extras.gradle" ]]; then
  mkdir -p "${ROOT_DIR}/cordova/platforms/android"
  cp "${ROOT_DIR}/cordova/build-extras.gradle" "${ROOT_DIR}/cordova/platforms/android/build-extras.gradle"
fi

mkdir -p "${ROOT_DIR}/cordova/platforms/android"
cat > "${ROOT_DIR}/cordova/platforms/android/local.properties" <<EOF
sdk.dir=${ANDROID_HOME}
EOF

cd cordova
npx cordova build android
