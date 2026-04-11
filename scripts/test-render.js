require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { renderCarousel, closeBrowser } = require('../src/services/renderer');

const SAMPLE_SCRIPT = {
  topic: "TRT não causa câncer de próstata",
  slides: [
    {
      index: 0,
      type: "hook",
      eyebrow: "TRT • MITO OU FATO",
      title: "TRT CAUSA CÂNCER DE PRÓSTATA?",
      subtitle: "A crença que priva homens de tratamento há décadas tem uma falha científica grave. Veja os dados.",
    },
    {
      index: 1,
      type: "body",
      eyebrow: "CONTEXTO",
      title: "DE ONDE VEIO ESSE MEDO?",
      body: "Em 1941, Huggins & Hodges mostraram que castração reduzia câncer de próstata avançado. Isso criou a narrativa de que testosterona 'alimenta' tumores — e ela dominou a medicina por 80 anos sem revisão crítica.",
      reference: "Huggins C, Hodges CV. Cancer Res. 1941",
    },
    {
      index: 2,
      type: "data",
      eyebrow: "DADO CIENTÍFICO",
      title: "0%",
      subtitle: "de aumento no risco de câncer de próstata com TRT em estudo de coorte com mais de 38.000 homens.",
      body: "Loeb et al. analisaram homens com hipogonadismo em TRT vs. não tratados. Nenhum aumento foi observado — pelo contrário, houve tendência protetora.",
      reference: "Loeb S et al. J Urol. 2017",
    },
    {
      index: 3,
      type: "comparison",
      eyebrow: "CONSENSO vs. FRONTEIRA",
      title: "O QUE MUDOU NA PRÁTICA CLÍNICA?",
      columns: {
        left: {
          heading: "CRENÇA ANTIGA",
          points: [
            "TRT contraindicada em todo homem com risco",
            "Testosterona alimenta tumores",
            "PSA elevado = proibição absoluta",
          ],
        },
        right: {
          heading: "EVIDÊNCIA ATUAL",
          points: [
            "TRT segura com rastreamento adequado",
            "Receptores saturam — fisiologia ≠ tumor",
            "Hipogonadismo não tratado tem mais riscos",
          ],
        },
      },
    },
    {
      index: 4,
      type: "cta",
      eyebrow: "SALVE ESTE CARROSSEL",
      title: "COMPARTILHE COM QUEM AINDA ACREDITA NESSE MITO",
      cta_medico: "Acesse a Mentoria em Medicina Hormonal e aprenda a prescrever TRT com segurança e embasamento.",
      cta_paciente: "Foi privado de tratamento por esse medo? Agende sua consulta e revise seu caso.",
      signature: "Dr. Paulo Guimarães Jr. • CRM-SC 21.698 • Medicina Hormonal & TRT",
    },
  ],
};

(async () => {
  const start = Date.now();
  console.log('Rendering test carousel...');

  const rendered = await renderCarousel(SAMPLE_SCRIPT.slides);

  const outDir = path.join(process.cwd(), 'output', 'test-trt');
  fs.mkdirSync(outDir, { recursive: true });

  rendered.forEach(({ index, type, buffer }) => {
    const filename = `${String(index).padStart(2, '0')}_${type}.png`;
    const fp = path.join(outDir, filename);
    fs.writeFileSync(fp, buffer);
    console.log(`  ✓ ${filename} (${Math.round(buffer.length / 1024)} KB)`);
  });

  await closeBrowser();
  console.log(`\nDone in ${((Date.now() - start) / 1000).toFixed(1)}s → ${outDir}`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
