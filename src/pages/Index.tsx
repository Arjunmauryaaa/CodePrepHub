import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Code2, ArrowRight, Users, FolderCode, Zap, Play } from 'lucide-react';

export default function Index() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-background overflow-hidden flex flex-col relative">
      {/* Background effects with animated floating blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        {/* Blob 1 */}
        <div className="absolute top-12 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] animate-blob animation-delay-0" />
        {/* Blob 2 */}
        <div className="absolute bottom-12 right-1/4 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[140px] animate-blob animation-delay-4000" />
        {/* Blob 3 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-[180px] animate-blob animation-delay-2000" />
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-border/40 backdrop-blur-md bg-background/70 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <FolderCode className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-extrabold text-foreground tracking-wide select-none">
              CodePrep Hub
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <Link to="/dashboard">
                <Button className="bg-primary hover:bg-primary/90 px-6 py-3 font-semibold text-lg shadow-md">
                  Go to Dashboard
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button className="bg-primary hover:bg-primary/90 px-6 py-3 font-semibold text-lg shadow-md">
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-grow">
        <section className="max-w-7xl mx-auto px-6 pt-24 pb-32 lg:pb-40 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/15 border border-primary/30 text-primary font-semibold text-sm tracking-wide mb-8 animate-fade-in">
            <Zap className="w-5 h-5" />
            Your Collaborative Coding Hub
          </div>

          <h1 className="text-6xl sm:text-7xl font-extrabold text-foreground leading-tight max-w-4xl mx-auto mb-8 animate-slide-up">
            Code. Collaborate.
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {' '}Conquer.
            </span>
          </h1>

          <p
            className="text-xl text-muted-foreground max-w-3xl mx-auto mb-14 leading-relaxed tracking-wide animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            A powerful VS Code-like editor to organize your programs, collaborate with peers,
            and ace your coding journey.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-6 max-w-lg mx-auto animate-slide-up"
            style={{ animationDelay: '0.2s' }}
          >
            <Link to={user ? '/workspace' : '/auth'}>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-lg px-10 py-5 font-semibold shadow-lg flex items-center justify-center gap-2"
              >
                <Play className="w-6 h-6" />
                Start Coding
              </Button>
            </Link>

            <Link to={user ? '/groups' : '/auth'}>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-10 py-5 border-border hover:bg-muted font-semibold shadow-sm flex items-center justify-center gap-2"
              >
                <Users className="w-6 h-6" />
                Join a Group
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-3 gap-10">
          {[{
            icon: <Code2 className="w-8 h-8 text-primary" />,
            title: 'Monaco Editor',
            description:
              'VS Code-powered editor with syntax highlighting, IntelliSense, and support for JavaScript, Python, Java, and C++.',
            bgColor: 'bg-primary/10',
            borderColor: 'border-primary/30',
            hoverBorder: 'hover:border-primary/50',
          }, {
            icon: <FolderCode className="w-8 h-8 text-accent" />,
            title: 'Personal Workspace',
            description:
              'Organize your code with folders. Keep your DSA solutions, practice problems, and projects neatly structured.',
            bgColor: 'bg-accent/10',
            borderColor: 'border-accent/30',
            hoverBorder: 'hover:border-accent/50',
          }, {
            icon: <Users className="w-8 h-8 text-success" />,
            title: 'Group Collaboration',
            description:
              'Create study groups, share programs with peers, and learn together. Perfect for placement preparation.',
            bgColor: 'bg-success/10',
            borderColor: 'border-success/30',
            hoverBorder: 'hover:border-success/50',
          }].map(({ icon, title, description, bgColor, borderColor, hoverBorder }, idx) => (
            <div
              key={idx}
              className={`group p-10 rounded-3xl bg-card/80 border ${borderColor} ${hoverBorder} transition-all duration-300 shadow-md hover:shadow-lg`}
            >
              <div
                className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${bgColor}`}
              >
                {icon}
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-4">{title}</h3>
              <p className="text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </section>

        {/* Call to Action */}
        <section className="max-w-7xl mx-auto px-6 py-28">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-card to-accent/20 border border-border/60 p-14 lg:p-20 text-center shadow-lg">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl font-extrabold text-foreground mb-5 leading-snug">
                Ready to level up your coding?
              </h2>
              <p className="text-lg text-muted-foreground mb-12 max-w-xl mx-auto leading-relaxed">
                Join thousands of developers sharpening their skills and collaborating to build
                amazing projects.
              </p>
              <Link to={user ? '/dashboard' : '/auth'}>
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-lg px-12 py-5 font-semibold shadow-lg inline-flex items-center gap-3 justify-center"
                >
                  {user ? 'Go to Dashboard' : 'Create Free Account'}
                  <ArrowRight className="w-6 h-6" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-20 border-t border-border/40 py-8 bg-background/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 text-center text-muted-foreground text-sm select-none">
          <p>© 2024 CodePrep Hub. Built for developers, by developer. - Arjun Dhananjay Maurya</p>
        </div>
      </footer>

      {/* Additional styles for blob animations */}
      <style>
        {`
          @keyframes blob {
            0%, 100% {
              transform: translate(0, 0) scale(1);
            }
            33% {
              transform: translate(30px, -50px) scale(1.1);
            }
            66% {
              transform: translate(-20px, 20px) scale(0.9);
            }
          }
          .animate-blob {
            animation: blob 8s ease-in-out infinite;
          }
          .animation-delay-0 {
            animation-delay: 0s;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}
      </style>
    </div>
  );
}
