#!/bin/bash
# Fix React 19 + Vitest 4: eliminar react-server condition del exports map
# Root cause: @vitejs/plugin-react añade react-server a resolve conditions.
# React's exports map prioriza react-server sobre default, sirviendo un build
# sin act(). Esto rompe @testing-library/react con "React.act is not a function".
REACT_PKG="node_modules/react/package.json"
if [ -f "$REACT_PKG" ]; then
  if grep -q "react-server" "$REACT_PKG"; then
    node -e "
      const fs = require('fs');
      const pkg = JSON.parse(fs.readFileSync('$REACT_PKG', 'utf8'));
      function strip(obj) {
        for (const k of Object.keys(obj)) {
          if (k === 'react-server') delete obj[k];
          else if (typeof obj[k] === 'object' && obj[k]) strip(obj[k]);
        }
      }
      strip(pkg.exports);
      fs.writeFileSync('$REACT_PKG', JSON.stringify(pkg, null, 2));
      console.log('[postinstall] Patched react/package.json — removed react-server condition');
    "
  fi
fi
