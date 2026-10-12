import fs from 'node:fs/promises';

const CATEGORY_SLUGS = [
  { slug: 'baby', name: 'Baby Class', levelGroup: 'Baby class to top class' },
  { slug: 'middle', name: 'Middle Class', levelGroup: 'Baby class to top class' },
  { slug: 'top', name: 'Top Class', levelGroup: 'Baby class to top class' },
  { slug: 'primary-one', name: 'Primary 1', levelGroup: 'P.1 to P.4' },
  { slug: 'primary-two', name: 'Primary 2', levelGroup: 'P.1 to P.4' },
  { slug: 'primary-three', name: 'Primary 3', levelGroup: 'P.1 to P.4' },
  { slug: 'primary-four', name: 'Primary 4', levelGroup: 'P.1 to P.4' },
  { slug: 'primary-five', name: 'Primary 5', levelGroup: 'P.5 to P.7' },
  { slug: 'primary-six', name: 'Primary 6', levelGroup: 'P.5 to P.7' },
  { slug: 'primary-seven', name: 'Primary 7', levelGroup: 'P.5 to P.7' },
  { slug: 'senior-one', name: 'Senior 1', levelGroup: 'S.1 to S.4' },
  { slug: 'senior-two', name: 'Senior 2', levelGroup: 'S.1 to S.4' },
  { slug: 'senior-three', name: 'Senior 3', levelGroup: 'S.1 to S.4' },
  { slug: 'senior-four', name: 'Senior 4', levelGroup: 'S.1 to S.4' },
  { slug: 'senior-five', name: 'Senior 5', levelGroup: 'S.5 to S.6' },
  { slug: 'senior-six', name: 'Senior 6', levelGroup: 'S.5 to S.6' },
];

async function scrapeSharebilityCatalog() {
  console.log('Starting Sharebility resource scraping across 16 classes...');
  const scrapedResources = [];

  for (const cat of CATEGORY_SLUGS) {
    try {
      console.log(`Fetching Sharebility resources for ${cat.name} (${cat.slug})...`);
      const res = await fetch(`https://sharebility.net/download-category/${cat.slug}/`);
      if (!res.ok) {
        console.warn(`Warning: failed to fetch ${cat.slug}: HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();
      const articleRegex = /<article [^>]*class=["']([^"']+)["'][^>]*>.*?<h3 class="elementor-post__title">\s*<a href="([^"]+)"\s*>(.*?)<\/a>.*?<\/article>/gs;
      const matches = [...html.matchAll(articleRegex)];
      
      console.log(`Found ${matches.length} resources for ${cat.name}`);
      for (const m of matches) {
        const classNames = m[1];
        const url = m[2].trim();
        const rawTitle = m[3].replace(/<[^>]+>/g, '').trim();
        const title = rawTitle
          .replace(/&#8211;/g, '–')
          .replace(/&#8217;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .trim();
        
        // Find author and date if present in article
        const authorMatch = m[0].match(/class="elementor-post-author">\s*([^<]+)\s*<\/span>/);
        const dateMatch = m[0].match(/class="elementor-post-date">\s*([^<]+)\s*<\/span>/);

        scrapedResources.push({
          title,
          url,
          author: authorMatch ? authorMatch[1].trim() : 'Sharebility Educator',
          date: dateMatch ? dateMatch[1].trim() : '2025/2026',
          classSlug: cat.slug,
          className: cat.name,
          levelGroup: cat.levelGroup,
          tags: classNames.split(/\s+/).filter(c => c.startsWith('wpdmtag-') || c.startsWith('wpdmcategory-')),
        });
      }
    } catch (err) {
      console.error(`Error scraping ${cat.slug}:`, err.message);
    }
  }

  console.log(`Total scraped resources: ${scrapedResources.length}`);
  return scrapedResources;
}

scrapeSharebilityCatalog().then(async (data) => {
  await fs.writeFile('scraped_sharebility_summary.json', JSON.stringify({ count: data.length, sample: data.slice(0, 10) }, null, 2));
  console.log('Saved summary to scraped_sharebility_summary.json');
}).catch(console.error);
