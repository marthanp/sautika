const CATEGORIES = [
  { slug: 'baby', name: 'Baby Class', group: 'Baby class to top class' },
  { slug: 'middle', name: 'Middle Class', group: 'Baby class to top class' },
  { slug: 'top', name: 'Top Class', group: 'Baby class to top class' },
  { slug: 'primary-one', name: 'P.1 Primary One', group: 'P.1 to P.4' },
  { slug: 'primary-four', name: 'P.4 Primary Four', group: 'P.1 to P.4' },
  { slug: 'primary-seven', name: 'P.7 Primary Seven', group: 'P.5 to P.7' },
  { slug: 'senior-one', name: 'S.1 Senior One', group: 'S.1 to S.4' },
  { slug: 'senior-six', name: 'S.6 Senior Six', group: 'S.5 to S.6' },
];

async function sampleTitles() {
  for (const cat of CATEGORIES) {
    const res = await fetch(`https://sharebility.net/download-category/${cat.slug}/`);
    const html = await res.text();
    const articles = [...html.matchAll(/<article [^>]*class=["']([^"']+)["'][^>]*>.*?<h3 class="elementor-post__title">\s*<a href="([^"]+)"\s*>(.*?)<\/a>/gs)];
    console.log(`\n=== ${cat.name} (${articles.length} items) ===`);
    const sample = articles.slice(0, 8).map(a => a[3].replace(/&#8211;/g, '-').replace(/&amp;/g, '&').replace(/&#8217;/g, "'").trim());
    console.log(sample.join('\n'));
  }
}

sampleTitles().catch(console.error);
