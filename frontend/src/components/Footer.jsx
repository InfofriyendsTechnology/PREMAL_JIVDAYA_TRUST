import nfcLogo from '../assets/LOGO_Black.png';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span className={styles.dividerText}>Powered by</span>
        <span className={styles.dividerLine} />
      </div>

      <div className={styles.inner}>
        <a href="https://nfcwala.in" target="_blank" rel="noopener noreferrer" className={styles.logoLink}>
          <img src={nfcLogo} alt="NFCWALA" className={styles.logo} />
        </a>
        <p className={styles.sub}>
          Digital Marketing &amp; Smart NFC Solutions
        </p>
      </div>
    </footer>
  );
}
