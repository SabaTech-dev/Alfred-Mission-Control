const { parseMaltHTML } = require('./malt');

describe('parseMaltHTML', () => {
  it('extracts leads from Malt HTML', () => {
    const html = `
      <html>
      <body>
        <div class="project-item">
          <h3><a href="/project/123">Desarrollo SaaS con IA</a></h3>
          <div class="project-description">Crear un SaaS de IA para automatización</div>
          <div class="client-name">Cliente Tech</div>
          <div class="budget">1000€</div>
        </div>
        <div class="project-item">
          <h3><a href="/project/456">API REST con Python</a></h3>
          <div class="project-description">Desarrollar API REST para integración</div>
          <div class="client-name">StartupXYZ</div>
          <div class="budget">500€</div>
        </div>
      </body>
      </html>
    `;

    const result = parseMaltHTML(html, 'https://www.malt.es');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      title: 'Desarrollo SaaS con IA',
      company: 'Cliente Tech',
      url: 'https://www.malt.es/project/123',
    });
    expect(result[1]).toMatchObject({
      title: 'API REST con Python',
      company: 'StartupXYZ',
      url: 'https://www.malt.es/project/456',
    });
  });

  it('returns empty array when no projects found', () => {
    const html = '<html><body><p>No results</p></body></html>';
    const result = parseMaltHTML(html, 'https://www.malt.es');
    expect(result).toEqual([]);
  });

  it('handles items with missing description or budget', () => {
    const html = `
      <html>
      <body>
        <div class="project-item">
          <h3><a href="/project/789">Solo título</a></h3>
        </div>
      </body>
      </html>
    `;

    const result = parseMaltHTML(html, 'https://www.malt.es');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Solo título');
    expect(result[0].description).toBe('');
    expect(result[0].company).toBe('Malt Client');
    expect(result[0].url).toBe('https://www.malt.es/project/789');
  });
});
