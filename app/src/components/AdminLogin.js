import { signIn } from "next-auth/react";
import { useState } from "react";

export default function AdminLogin({ callbackUrl }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    if (!result?.ok) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    const destination = result.url || callbackUrl || "/admin";
    const isSamePage = destination === "/admin" || destination === window.location.pathname || destination === window.location.href;

    if (isSamePage) {
      window.location.href = `/admin?refresh=${Date.now()}`;
      return;
    }

    window.location.href = destination;
  }

  return <main className="admin-login">
    <form className="admin-login-card" onSubmit={handleSubmit}>
      <img src="/brand/logo.png" alt="Génération Verte RDC" className="admin-login-logo" />
      <p className="eyebrow">Espace prive</p>
      <h1>Administration GV-RDC</h1>
      <label>Email<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label>Mot de passe<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      {error && <p role="alert" className="admin-message">{error}</p>}
      <button className="btn btn-yellow" type="submit" disabled={loading}>{loading ? "Connexion..." : "Se connecter"}</button>
    </form>
  </main>;
}
