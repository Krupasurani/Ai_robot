import { m } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SimpleLayout } from 'src/layouts/simple-layout';
import { varBounce } from 'src/components/animate';

export function View403() {
  return (
    <SimpleLayout compact>
      <div className="container mx-auto px-4 py-16 text-center">
        <m.div variants={varBounce().in}>
          <h1 className="text-3xl font-bold mb-4 text-foreground">No permission</h1>
        </m.div>

        <m.div variants={varBounce().in}>
          <p className="text-muted-foreground mb-8">
            The page you&apos;re trying to access has restricted access. Please refer to your system
            administrator.
          </p>
        </m.div>

        <Button asChild size="lg">
          <Link to="/">Go to home</Link>
        </Button>
      </div>
    </SimpleLayout>
  );
}
