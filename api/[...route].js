const { handleApi } = require('../server.js');

module.exports = async (req, res) => {
  try {
    // Vercel populates req.url. Reconstruct the full URL.
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    
    // Ensure the pathname starts with /api/ because handleApi expects it.
    // If req.url is just the query or path from Vercel's rewrite, we enforce it:
    if (!url.pathname.startsWith('/api/')) {
      const routeStr = req.query.route ? (Array.isArray(req.query.route) ? req.query.route.join('/') : req.query.route) : url.pathname.replace(/^\//, '');
      url.pathname = '/api/' + routeStr;
    }
    
    return await handleApi(req, res, url);
  } catch (error) {
    console.error("Vercel Function Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
