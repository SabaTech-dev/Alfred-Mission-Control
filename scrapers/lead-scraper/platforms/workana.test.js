const { parseWorkanaHTML } = require('./workana');

describe('parseWorkanaHTML', () => {
  it('extracts leads from Workana HTML', () => {
    const html = `
      <html>
      <body>
        <div class="project-item">
          <h3><a href="/job/123">Automatización de procesos con IA</a></h3>
          <div class="project-description">Necesito automatizar procesos con Python</div>
          <div class="project-budget">Presupuesto: USD 1000</div>
        </div>
        <div class="project-item">
          <h3><a href="/job/456">Desarrollo de API REST</a></h3>
          <div class="project-description">API para integración SaaS</div>
          <div class="project-budget">Presupuesto: USD 500</div>
        </div>
      </body>
      </html>
    `;

    const result = parseWorkanaHTML(html, 'https://www.workana.com');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      title: 'Automatización de procesos con IA',
      company: 'Workana Client',
      url: 'https://www.workana.com/job/123',
    });
    expect(result[1]).toMatchObject({
      title: 'Desarrollo de API REST',
      company: 'Workana Client',
      url: 'https://www.workana.com/job/456',
    });
  });

  it('returns empty array when no projects found', () => {
    const html = '<html><body><div class="no-results">No hay proyectos</div></body></html>';
    const result = parseWorkanaHTML(html, 'https://www.workana.com');
    expect(result).toEqual([]);
  });

  it('handles items with missing description', () => {
    const html = `
      <html>
      <body>
        <div class="project-item">
          <h3><a href="/job/999">Solo título</a></h3>
        </div>
      </body>
      </html>
    `;

    const result = parseWorkanaHTML(html, 'https://www.workana.com');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Solo título');
    expect(result[0].description).toBe('');
    expect(result[0].company).toBe('Workana Client');
  });
});
