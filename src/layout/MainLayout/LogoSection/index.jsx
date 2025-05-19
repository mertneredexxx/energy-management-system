/* eslint-disable prettier/prettier */
import { Link as RouterLink } from 'react-router-dom';
import Link from '@mui/material/Link';
import logo from '../../../assets/images/icons/images.png';  // <- import your PNG here

export default function LogoSection() {
  return (
    <Link
      underline="none"
      sx={{ display: 'flex', alignItems: 'center' }}
    >
      <img
        src={logo}
        alt="Logo"
        style={{ width: 40, height: 40, objectFit: 'contain' }}
      />
    </Link>
  );
}
