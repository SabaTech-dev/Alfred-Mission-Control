function toLead(raw, source) {
  return {
    title: raw.title || '',
    company: raw.company || '',
    description: raw.description || '',
    url: raw.url || '',
    source: source || '',
    source_type: raw.source_type != null ? raw.source_type : null,
    skills: raw.skills || [],
    budget_min: raw.budget_min != null ? raw.budget_min : null,
    budget_max: raw.budget_max != null ? raw.budget_max : null,
    currency: raw.currency || 'EUR',
    remote: raw.remote != null ? raw.remote : true,
    location: raw.location || null,
    published_at: raw.published_at || null,
  };
}

module.exports = { toLead };
