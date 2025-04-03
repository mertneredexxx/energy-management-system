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
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Loader from '../../../ui-component/Loader';
// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';
import { supabase } from '../../../api/supabaseClient';
// assets
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate } from 'react-router-dom';

// ===========================|| JWT - REGISTER ||=========================== //

export default function AuthRegister() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [checked, setChecked] = useState(true);
  const [isLoading, setLoading] = useState(false);
  // form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // login handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      setErrorMsg(error.message);
      setErrorDialogOpen(true);
      setLoading(false);
    } else {
      setLoading(false);
      // ✅ Navigate to home page or dashboard after login
      navigate('/login');
    }
  };
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  if (isLoading) {
    return <Loader />;
  } else {
    return (
      <>
        <Grid container direction="column" spacing={2} sx={{ justifyContent: 'center' }}>
          <Grid container sx={{ alignItems: 'center', justifyContent: 'center' }} size={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1">Sign up with Email address</Typography>
            </Box>
          </Grid>
        </Grid>

        <Grid container spacing={{ xs: 0, sm: 2 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="First Name"
              margin="normal"
              name="firstName"
              type="text"
              value="Jhones"
              sx={{ ...theme.typography.customInput }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Last Name"
              margin="normal"
              name="lastName"
              type="text"
              value="Doe"
              sx={{ ...theme.typography.customInput }}
            />
          </Grid>
        </Grid>
        <FormControl fullWidth sx={{ ...theme.typography.customInput }}>
          <InputLabel htmlFor="outlined-adornment-email-register">Email Address / Username</InputLabel>
          <OutlinedInput onChange={(e) => setEmail(e.target.value)} id="outlined-adornment-email-register" type="email" value={email} name="email" inputProps={{}} />
        </FormControl>

        <FormControl fullWidth sx={{ ...theme.typography.customInput }}>
          <InputLabel htmlFor="outlined-adornment-password-register">Password</InputLabel>
          <OutlinedInput
            id="outlined-adornment-password-register"
            type={showPassword ? 'text' : 'password'}
            value={password}
            name="password"
            label="Password"
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
          />
        </FormControl>

        <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Grid>
            <FormControlLabel
              control={<Checkbox checked={checked} onChange={(event) => setChecked(event.target.checked)} name="checked" color="primary" />}
              label={
                <Typography variant="subtitle1">
                  Agree with &nbsp;
                  <Typography variant="subtitle1" component={Link} to="#">
                    Terms & Condition.
                  </Typography>
                </Typography>
              }
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
          <AnimateButton>
            <Button onClick={(e) => handleSubmit(e)} disableElevation fullWidth size="large" type="submit" variant="contained" color="secondary">
              Sign up
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
}
