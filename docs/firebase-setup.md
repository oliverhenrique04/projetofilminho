# Firebase Setup do Filminho

## Android app id

Use `br.com.filminho.app` como package ID no Firebase Console.

## Arquivo do app

1. Crie um app Android no projeto Firebase.
2. Baixe `google-services.json`.
3. Copie o arquivo para `cordova/google-services.json`.

## Credenciais do servidor

1. Gere uma Service Account no Firebase Console.
2. Salve o JSON fora do repositório.
3. Exporte a variável:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/caminho/seguro/firebase-service-account.json"
```

## Teste manual

1. Faça login no app Android.
2. Permita notificações.
3. Verifique se o token é registrado no endpoint `/api/push/register`.
4. Use o Firebase Console ou o servidor para enviar uma push de teste.
