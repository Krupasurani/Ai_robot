import { useState, useEffect } from 'react';
import NProgress from 'nprogress';
import { usePathname } from 'src/routes/hooks';

export function ProgressBar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    NProgress.start();

    const timer = setTimeout(() => {
      NProgress.done();
    }, 200);

    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, [pathname, mounted]);

  useEffect(() => {
    if (!mounted) return;

    // Configure NProgress
    NProgress.configure({
      showSpinner: false,
      trickleSpeed: 200,
      minimum: 0.08,
    });

    // Style NProgress with Tailwind CSS colors
    const style = document.createElement('style');
    style.id = 'nprogress-styles';
    style.textContent = `
      #nprogress {
        pointer-events: none;
      }
      #nprogress .bar {
        background: hsl(var(--primary));
        height: 2px;
        z-index: 9999;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
      }
      #nprogress .peg {
        display: block;
        position: absolute;
        right: 0px;
        width: 100px;
        height: 100%;
        box-shadow: 0 0 10px hsl(var(--primary)), 0 0 5px hsl(var(--primary));
        opacity: 1;
        transform: rotate(3deg) translate(0px, -4px);
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById('nprogress-styles');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, [mounted]);

  if (!mounted) return null;

  return null;
}

