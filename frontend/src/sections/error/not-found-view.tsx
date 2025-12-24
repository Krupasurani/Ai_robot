import { m } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { SimpleLayout } from 'src/layouts/simple-layout';
import { varBounce } from 'src/components/animate';

export function NotFoundView() {
  return (
    <SimpleLayout compact>
      <div className="container mx-auto px-4 py-16 text-center">
        <m.div variants={varBounce().in}>
          <h1 className="text-3xl font-bold mb-4 text-foreground">Sorry, page not found!</h1>
        </m.div>

        <m.div variants={varBounce().in}>
          <p className="text-muted-foreground mb-8">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. Perhaps you&apos;ve
            mistyped the URL? Be sure to check your spelling.
          </p>
        </m.div>

        <Button asChild size="lg">
          <Link to="/">Go to home</Link>
        </Button>
      </div>
    </SimpleLayout>
  );
}
