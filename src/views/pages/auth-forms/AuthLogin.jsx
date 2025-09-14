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
import { 
    Paper, 
    CircularProgress, 
    Alert,
    Fade,
    Stack,
    Divider
} from '@mui/material';
import { supabase } from '../../../api/supabaseClient';
// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';
import { useNavigate } from 'react-router-dom';
// assets
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LoginIcon from '@mui/icons-material/Login';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import ErrorDialog from '../../../ui-component/ErrorDialog';
// ===============================|| JWT - LOGIN ||=============================== //

export default function AuthLogin() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(true);
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  // form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // login handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setErrorMsg(error.message);
      setErrorDialogOpen(true);
      setLoading(false);
    } else {
      // ✅ Navigate to home page or dashboard after login
      navigate('/devices');
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        {/* Email Field */}
        <FormControl fullWidth>
          <InputLabel htmlFor="outlined-adornment-email-login">Email Address</InputLabel>
          <OutlinedInput 
            id="outlined-adornment-email-login" 
            type="email" 
            value={email} 
            name="email" 
            onChange={(e) => setEmail(e.target.value)}
            startAdornment={
              <InputAdornment position="start">
                <EmailIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            }
            sx={{
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: 2
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main'
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main'
              }
            }}
            label="Email Address"
          />
        </FormControl>

        {/* Password Field */}
        <FormControl fullWidth>
          <InputLabel htmlFor="outlined-adornment-password-login">Password</InputLabel>
          <OutlinedInput
            id="outlined-adornment-password-login"
            type={showPassword ? 'text' : 'password'}
            value={password}
            name="password"
            onChange={(e) => setPassword(e.target.value)}
            startAdornment={
              <InputAdornment position="start">
                <LockIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            }
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={handleClickShowPassword}
                  onMouseDown={handleMouseDownPassword}
                  edge="end"
                  size="large"
                  sx={{
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'primary.light',
                      color: 'primary.main'
                    }
                  }}
                >
                  {showPassword ? <Visibility /> : <VisibilityOff />}
                </IconButton>
              </InputAdornment>
            }
            sx={{
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: 2
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main'
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main'
              }
            }}
            label="Password"
          />
        </FormControl>

        {/* Remember me and Forgot Password */}
        <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Grid>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={checked} 
                  onChange={(event) => setChecked(event.target.checked)} 
                  name="checked" 
                  color="primary" 
                  sx={{
                    '&.Mui-checked': {
                      color: 'primary.main'
                    }
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Keep me logged in
                </Typography>
              }
            />
          </Grid>
          <Grid>
            <Typography 
              variant="body2" 
              component={Link} 
              to="/forgot-password" 
              sx={{ 
                color: 'primary.main',
                textDecoration: 'none',
                fontWeight: 500,
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              Forgot Password?
            </Typography>
          </Grid>
        </Grid>

        {/* Login Button */}
        <Box sx={{ mt: 3 }}>
          <AnimateButton>
            <Button 
              onClick={(e) => handleSubmit(e)} 
              color="primary" 
              fullWidth 
              size="large" 
              type="submit" 
              variant="contained"
              disabled={loading || !email || !password}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
              sx={{
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1.1rem',
                background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1565c0, #1976d2)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(25, 118, 210, 0.3)'
                },
                '&:disabled': {
                  background: 'rgba(0, 0, 0, 0.12)',
                  color: 'rgba(0, 0, 0, 0.26)'
                }
              }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </AnimateButton>
        </Box>

        {/* Divider */}
        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            New to our platform?
          </Typography>
        </Divider>

        {/* Register Link */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Typography 
              component={Link} 
              to="/register" 
              variant="body2"
              sx={{ 
                color: 'primary.main',
                textDecoration: 'none',
                fontWeight: 600,
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              Create one here
            </Typography>
          </Typography>
        </Box>
      </Stack>

      <ErrorDialog
        open={errorDialogOpen}
        message={errorMsg}
        onClose={() => setErrorDialogOpen(false)}
      />
    </Box>
  );
}
