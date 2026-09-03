const socialLinks = [
  { name: "Facebook", href: "#", path: "M14 8h3V5h-3c-2.2 0-4 1.8-4 4v2H7v3h3v6h3v-6h3l1-3h-4V9c0-.6.4-1 1-1Z" },
  { name: "YouTube", href: "#", path: "M21 8.2a2.8 2.8 0 0 0-2-2C17.2 5.7 12 5.7 12 5.7s-5.2 0-7 .5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2.5 12 29 29 0 0 0 3 15.8a2.8 2.8 0 0 0 2 2c1.8.5 7 .5 7 .5s5.2 0 7-.5a2.8 2.8 0 0 0 2-2 29 29 0 0 0 .5-3.8 29 29 0 0 0-.5-3.8ZM10 15.2V8.8l5.5 3.2-5.5 3.2Z" },
  { name: "TikTok", href: "#", path: "M15 4h3a4.5 4.5 0 0 0 3 3v3a7.5 7.5 0 0 1-3-.8V15a5 5 0 1 1-5-5h1v3h-1a2 2 0 1 0 2 2V4Z" },
  { name: "WhatsApp", href: "#", path: "M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3Zm0 2a7 7 0 0 1 6.1 10.5 7 7 0 0 1-8.1 3l-.5-.2-2.7.7.7-2.6-.3-.5A7 7 0 0 1 12 5Zm-3 3.3c-.2 0-.5.1-.7.4-.2.3-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.6 4 3.5 2 .8 2.4.6 2.8.6.4 0 1.3-.5 1.5-1 .2-.5.2-.9.1-1-.1-.1-.3-.2-.7-.4l-1.5-.7c-.3-.1-.5-.2-.7.2l-.6.8c-.2.2-.3.3-.6.1-.3-.1-1.1-.4-2-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.3 0-.4.1-.5l.5-.6c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.7-1.7c-.2-.5-.4-.5-.6-.5Z" },
];

export default function SocialLinks() {
  return <nav className="social-links" aria-label="Réseaux sociaux">{socialLinks.map((social) => <a href={social.href} key={social.name} aria-label={social.name} title={social.name}><svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d={social.path} /></svg><span>{social.name}</span></a>)}</nav>;
}
