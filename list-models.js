const API_KEY = 'AIzaSyDGN_BlNx9KDfAgP5uLgBC8Wy52KZ2IwF4';

async function listModels() {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models';

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-goog-api-key': API_KEY,
    },
  });

  if (!response.ok) {
    console.error('Error:', await response.text());
    return;
  }

  const data = await response.json();
  console.log('Available models:');
  data.models.forEach(model => {
    console.log(`- ${model.name}: ${model.description}`);
  });
}

listModels().catch(console.error);