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
  Box
} from '@mui/material';
import Loader from '../../../ui-component/Loader';
import AnimateButton from 'ui-component/extended/AnimateButton';
import ErrorDialog from '../../../ui-component/ErrorDialog';
import { supabase } from '../../../api/supabaseClient';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
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
      <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
        <Grid item xs={12}>
          <Typography variant="subtitle1">
            Sign up with Email address
          </Typography>
        </Grid>

        {/* First + Last Name */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            sx={{ ...theme.typography.customInput }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            sx={{ ...theme.typography.customInput }}
          />
        </Grid>

        {/* Email */}
        <Grid item xs={12}>
          <FormControl fullWidth sx={{ ...theme.typography.customInput }}>
            <InputLabel htmlFor="outlined-email">Email Address</InputLabel>
            <OutlinedInput
              id="outlined-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              label="Email Address"
            />
          </FormControl>
        </Grid>

        {/* Password */}
        <Grid item xs={12}>
          <FormControl fullWidth sx={{ ...theme.typography.customInput }}>
            <InputLabel htmlFor="outlined-password">Password</InputLabel>
            <OutlinedInput
              id="outlined-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              label="Password"
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    size="large"
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
            />
          </FormControl>
        </Grid>

        {/* Terms */}
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="subtitle1">
                Agree with&nbsp;
                <Typography component={Link} to="#" variant="subtitle1">
                  Terms & Conditions
                </Typography>
              </Typography>
            }
          />
        </Grid>

        {/* Submit */}
        <Grid item xs={12}>
          <Box sx={{ mt: 2 }}>
            <AnimateButton>
              <Button
                fullWidth
                size="large"
                type="submit"
                variant="contained"
                color="secondary"
                onClick={handleSubmit}
              >
                Sign up
              </Button>
            </AnimateButton>
          </Box>
        </Grid>
      </Grid>

      <ErrorDialog
        open={errorDialogOpen}
        message={errorMsg}
        onClose={() => setErrorOpen(false)}
      />
    </>
  );
}
