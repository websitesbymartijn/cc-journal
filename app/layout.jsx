import './globals.css';
import Nav from './_components/Nav';

export const metadata = {
  title: 'CC Journal',
  description: 'ChartChampions journal — Martijn & Jente',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app">
          <Nav />
          <main className="container">{children}</main>
        </div>
        <div className="footer">
          cc-journal &middot; built with the panel &middot; "take it easy"
        </div>
      </body>
    </html>
  );
}
