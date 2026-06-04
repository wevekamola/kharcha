export default function Wordmark({ size = 28, glow = true }) {
  return (
    <span className="wordmark" style={{ fontSize: size }}>
      Kha<span className={'rupee' + (glow ? ' glow' : '')}>₹</span>cha
    </span>
  );
}
