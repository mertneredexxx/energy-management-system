/* eslint-disable prettier/prettier */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useTheme,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  TextField,
  Typography,
  Box,
  Stack,
  Divider,
  Chip,
  LinearProgress,
  Alert
} from '@mui/material';
import Loader from '../../../ui-component/Loader';
import AnimateButton from 'ui-component/extended/AnimateButton';
import ErrorDialog from '../../../ui-component/ErrorDialog';
import { supabase } from '../../../api/supabaseClient';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SecurityIcon from '@mui/icons-material/Security';
export default function AuthRegister() {
  const theme = useTheme();
  const navigate = useNavigate();

  // show/hide password
  const [showPassword, setShowPassword] = useState(false);
  // form fields
  const [firstName, setFirstName] = useState('');   // ◀ new
  const [lastName, setLastName]   = useState('');   // ◀ new
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [checked, setChecked]     = useState(true);

  // loading & errors
  const [isLoading, setLoading]       = useState(false);
  const [errorDialogOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');

  // Password strength
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordStrength(checkPasswordStrength(value));
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 25) return 'error';
    if (passwordStrength < 50) return 'warning';
    if (passwordStrength < 75) return 'info';
    return 'success';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 25) return 'Weak';
    if (passwordStrength < 50) return 'Fair';
    if (passwordStrength < 75) return 'Good';
    return 'Strong';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // sign up & include firstName/lastName in user_metadata
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });

    if (error) {
      setErrorMsg(error.message);
      setErrorOpen(true);
      setLoading(false);
    } else {

      const userId = data.user.id;
      const { error: evError } = await supabase
        .from('ev_sessions')
        .insert({
          user_id:     userId,
          charging_rate: 4,          // kW
          plug_in_time:  '22:00',
          plug_out_time: '08:00',
          initial_soc:    35,        // %
          final_soc:       5,        // 35%−30%
          daily_usage:   200         // km/day (example)
        });
    
      if (evError) {
        console.error('Failed to create default EV session:', evError);
        // you might want to show a warning here, but it shouldn't block signup
      }
      
      setLoading(false);
      navigate('/login');
    }
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword  = (e) => e.preventDefault();

  if (isLoading) return <Loader />;

  return (
    <>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography 
            variant="h4" 
            sx={{ 
              mb: 1,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 600
            }}
          >
            Create Account
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Join our energy management platform
          </Typography>
        </Box>

        <Divider>
          <Chip 
            label="Sign Up" 
            size="small" 
            sx={{ 
              background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
              color: 'white',
              fontWeight: 500
            }} 
          />
        </Divider>

        {/* Name Fields */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon color="primary" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: 'primary.main',
                },
                '&.Mui-focused fieldset': {
                  borderWidth: 2,
                },
              },
            }}
          />
          <TextField
            fullWidth
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon color="primary" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: 'primary.main',
                },
                '&.Mui-focused fieldset': {
                  borderWidth: 2,
                },
              },
            }}
          />
        </Stack>

        {/* Email Field */}
        <TextField
          fullWidth
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon color="primary" />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
              '&.Mui-focused fieldset': {
                borderWidth: 2,
              },
            },
          }}
        />

        {/* Password Field */}
        <Box>
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={handlePasswordChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="primary" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: 'primary.main',
                },
                '&.Mui-focused fieldset': {
                  borderWidth: 2,
                },
              },
            }}
          />
          
          {/* Password Strength Indicator */}
          {password && (
            <Box sx={{ mt: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <SecurityIcon fontSize="small" color={getPasswordStrengthColor()} />
                <Typography variant="caption" color={getPasswordStrengthColor() + '.main'}>
                  Password Strength: {getPasswordStrengthText()}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={passwordStrength}
                color={getPasswordStrengthColor()}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.palette.grey[200],
                }}
              />
            </Box>
          )}
        </Box>

        {/* Terms and Conditions */}
        <FormControlLabel
          control={
            <Checkbox
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              sx={{
                '&.Mui-checked': {
                  color: 'primary.main',
                },
              }}
            />
          }
          label={
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="body2">
                I agree to the
              </Typography>
              <Typography 
                component={Link} 
                to="#" 
                variant="body2" 
                sx={{ 
                  color: 'primary.main',
                  textDecoration: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    textDecoration: 'underline',
                  }
                }}
              >
                Terms & Conditions
              </Typography>
            </Stack>
          }
        />

        {/* Register Button */}
        <AnimateButton>
          <Button
            fullWidth
            size="large"
            type="submit"
            variant="contained"
            onClick={handleSubmit}
            disabled={!checked || isLoading}
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              height: 48,
              fontWeight: 600,
              fontSize: '1rem',
              textTransform: 'none',
              borderRadius: 2,
              boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #1BA3D1 90%)',
                boxShadow: '0 6px 10px 4px rgba(33, 203, 243, .3)',
                transform: 'translateY(-1px)',
              },
              '&:disabled': {
                background: theme.palette.grey[300],
                boxShadow: 'none',
              },
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {isLoading ? (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
                <Typography>Creating Account...</Typography>
              </Stack>
            ) : (
              <Stack direction="row" alignItems="center" spacing={1}>
                <CheckCircleIcon />
                <Typography>Create Account</Typography>
              </Stack>
            )}
          </Button>
        </AnimateButton>

        {/* Login Link */}
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" color="textSecondary">
            Already have an account?{' '}
            <Typography 
              component={Link} 
              to="/login" 
              variant="body2" 
              sx={{ 
                color: 'primary.main',
                textDecoration: 'none',
                fontWeight: 600,
                '&:hover': {
                  textDecoration: 'underline',
                }
              }}
            >
              Sign In
            </Typography>
          </Typography>
        </Box>
      </Stack>

      <ErrorDialog
        open={errorDialogOpen}
        message={errorMsg}
        onClose={() => setErrorOpen(false)}
      />
    </>
  );
}
