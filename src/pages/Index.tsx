import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Code2, ArrowRight, Users, FolderCode, Zap, Play } from 'lucide-react';

export default function Index() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/3 to-accent/3 rounded-full blur-[150px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                <FolderCode className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">CodePrep Hub</span>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <Link to="/dashboard">
                  <Button className="bg-primary hover:bg-primary/90">
                    Go to Dashboard
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button className="bg-primary hover:bg-primary/90">
                    Get Started
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 py-24 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8 animate-fade-in">
              <Zap className="w-4 h-4" />
              Your Placement Prep Partner
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold text-foreground mb-6 leading-tight animate-slide-up">
              Code. Collaborate.
              <span className="text-gradient"> Conquer.</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
              A powerful VS Code-like editor to organize your programs, collaborate with peers, 
              and ace your placement interviews.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Link to={user ? '/workspace' : '/auth'}>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-6">
                  <Play className="mr-2 w-5 h-5" />
                  Start Coding
                </Button>
              </Link>
              <Link to={user ? '/groups' : '/auth'}>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-border hover:bg-muted">
                  <Users className="mr-2 w-5 h-5" />
                  Join a Group
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group p-8 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-glow">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Code2 className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Monaco Editor</h3>
              <p className="text-muted-foreground">
                VS Code-powered editor with syntax highlighting, IntelliSense, and support for 
                JavaScript, Python, Java, and C++.
              </p>
            </div>

            <div className="group p-8 rounded-2xl bg-card/50 border border-border/50 hover:border-accent/30 transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FolderCode className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Personal Workspace</h3>
              <p className="text-muted-foreground">
                Organize your code with folders. Keep your DSA solutions, practice problems, 
                and projects neatly structured.
              </p>
            </div>

            <div className="group p-8 rounded-2xl bg-card/50 border border-border/50 hover:border-success/30 transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-success" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Group Collaboration</h3>
              <p className="text-muted-foreground">
                Create study groups, share programs with peers, and learn together. 
                Perfect for placement preparation.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border/50 p-12 lg:p-16 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
            
            <div className="relative z-10">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Ready to level up your coding?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of developers preparing for their dream placements.
              </p>
              <Link to={user ? '/dashboard' : '/auth'}>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-10 py-6">
                  {user ? 'Go to Dashboard' : 'Create Free Account'}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-muted-foreground text-sm">
          <p>© 2024 CodePrep Hub. Built for developers, by developers.</p>
        </div>
      </footer>
    </div>
  );
}