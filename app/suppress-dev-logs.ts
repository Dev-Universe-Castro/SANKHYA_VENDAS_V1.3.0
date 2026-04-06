
// Suprimir logs desnecessários em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    // Filtrar logs do Fast Refresh e outros logs repetitivos
    const message = args.join(' ');
    
    const suppressPatterns = [
      '[Fast Refresh] rebuilding',
      '[Fast Refresh] done',
      '[Vercel Web Analytics]',
      'Download the React DevTools',
    ];
    
    if (suppressPatterns.some(pattern => message.includes(pattern))) {
      return; // Não logar
    }
    
    originalLog.apply(console, args);
  };
}
