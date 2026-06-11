# Firebase Setup do Filminho

## O que configurar na conta Firebase

1. Crie ou selecione um projeto no Firebase Console.
2. Adicione um app Android com o package ID `br.com.filminho.app`.
3. Confirme que o app Android cadastrado corresponde ao projeto `filminho-4dadc`.
4. O arquivo `cordova/google-services.json` já está incluído no projeto e aponta para esse app Android.
5. Em `Project settings > Cloud Messaging`, habilite a Cloud Messaging API.
6. Em `Project settings > Service accounts`, gere uma nova chave privada JSON para o backend.
7. Salve a chave fora do repositório e aponte `GOOGLE_APPLICATION_CREDENTIALS` no `.env` local ou na variável de ambiente do servidor.

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/caminho/seguro/firebase-service-account.json"
```

Exemplo local:

```bash
cp .env.example .env
```

Variáveis relevantes para o deploy publicado:

```bash
APP_BASE_PATH=/filminho
APP_PUBLIC_API_URL=https://nuted-ia.dev/filminho/api
GOOGLE_APPLICATION_CREDENTIALS=/home/mrosa/.secrets/filminho-firebase-admin.json
```

## O que já está pronto no projeto

- O backend já usa `firebase-admin` e faz fallback seguro quando a credencial não existe.
- O backend agora carrega `.env` automaticamente na inicialização.
- O backend agora aceita publicação com prefixo `/filminho`.
- A inbox interna e as notificações locais funcionam mesmo sem Firebase.
- O app Cordova Android já inclui `cordova-plugin-firebase-messaging`.
- O `google-services.json` do projeto `filminho-4dadc` já está em `cordova/google-services.json`.
- O build Android está preparado para copiar esse arquivo para `app/google-services.json`.

## O que falta para push FCM nativo no APK

1. Gerar um APK novo com o app Android registrado no Firebase.
2. Abrir o app no dispositivo, permitir notificações e validar o registro do token em `/api/push/register`.
3. Configurar `GOOGLE_APPLICATION_CREDENTIALS` no backend para envio real de push.
4. Enviar uma push de teste pelo Firebase Console ou pelo backend.

## Teste manual recomendado

1. Faça login no app Android.
2. Permita notificações.
3. Confirme no backend que o token do aparelho foi salvo.
4. Envie uma push de teste pelo Firebase Console ou pelo backend.
