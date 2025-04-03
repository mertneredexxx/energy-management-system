import { useState } from 'react';
import { Link } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid2';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { supabase } from '../../../api/supabaseClient';
// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';
import { useNavigate } from 'react-router-dom';
// assets
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ErrorDialog from '../../../ui-component/ErrorDialog';
// ===============================|| JWT - LOGIN ||=============================== //

export default function AuthLogin() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  // form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // login handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setErrorMsg(error.message);
      setErrorDialogOpen(true);

    } else {
      // ✅ Navigate to home page or dashboard after login
      navigate('/');
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  return (
    <>
      <FormControl fullWidth sx={{ ...theme.typography.customInput }}>
        <InputLabel htmlFor="outlined-adornment-email-login">Email Address / Username</InputLabel>
        <OutlinedInput onChange={(e) => setEmail(e.target.value)} id="outlined-adornment-email-login" type="email" value="info@codedthemes.com" name="email" inputProps={{}} />
      </FormControl>

      <FormControl fullWidth sx={{ ...theme.typography.customInput }}>
        <InputLabel htmlFor="outlined-adornment-password-login">Password</InputLabel>
        <OutlinedInput
          id="outlined-adornment-password-login"
          type={showPassword ? 'text' : 'password'}
          value="123456"
          name="password"
          onChange={(e) => setPassword(e.target.value)}
          endAdornment={
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={handleClickShowPassword}
                onMouseDown={handleMouseDownPassword}
                edge="end"
                size="large"
              >
                {showPassword ? <Visibility /> : <VisibilityOff />}
              </IconButton>
            </InputAdornment>
          }
          inputProps={{}}
          label="Password"
        />
      </FormControl>

      <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Grid>
          <FormControlLabel
            control={<Checkbox checked={checked} onChange={(event) => setChecked(event.target.checked)} name="checked" color="primary" />}
            label="Keep me logged in"
          />
        </Grid>
        <Grid>
          <Typography variant="subtitle1" component={Link} to="/forgot-password" color="secondary" sx={{ textDecoration: 'none' }}>
            Forgot Password?
          </Typography>
        </Grid>
      </Grid>
      <Box sx={{ mt: 2 }}>
        <AnimateButton>
          <Button onClick={(e) => handleSubmit(e)} color="secondary" fullWidth size="large" type="submit" variant="contained">
            Sign In
          </Button>
        </AnimateButton>
      </Box>
      <ErrorDialog
        open={errorDialogOpen}
        message={errorMsg}
        onClose={() => setErrorDialogOpen(false)}
      />
    </>
  );
}
