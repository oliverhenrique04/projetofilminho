const axios = require('axios');

async function run() {
  console.log('=== Testando APIs Públicas ===\n');

  // Teste ViaCEP
  try {
    const cep = await axios.get('https://viacep.com.br/ws/01001000/json/');
    console.log('✅ ViaCEP OK:', cep.data.uf, cep.data.localidade);
  } catch (err) {
    console.error('❌ ViaCEP falhou:', err.message);
  }

  // Teste IBGE
  try {
    const ufs = await axios.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados');
    console.log('✅ IBGE OK:', Array.isArray(ufs.data), 'Total:', ufs.data.length, 'estados');
  } catch (err) {
    console.error('❌ IBGE falhou:', err.message);
  }

  console.log('\n=== Testes concluídos ===');
}

run().catch((err) => {
  console.error('Teste APIs falhou:', err.message);
  process.exit(1);
});
