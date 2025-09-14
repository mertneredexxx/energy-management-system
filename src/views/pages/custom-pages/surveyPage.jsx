import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  TextField,
  Box,
  Paper,
  Chip,
  Stack,
  Alert,
  Snackbar,
  Rating,
  Checkbox,
  FormGroup,
  LinearProgress,
  IconButton
} from '@mui/material';
import {
  Send as SendIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Assignment as SurveyIcon,
  CheckCircle as CheckIcon,
  ThumbUp as ThumbUpIcon,
  Feedback as FeedbackIcon,
  Timeline as AnalyticsIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { supabase } from '../../../api/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';

const SurveyPage = () => {
  const authData = useAuth();
  const { user, session, loading: authLoading } = authData;
  
  console.log('=== AUTH DEBUG ===');
  console.log('Auth data:', authData);
  console.log('User:', user);
  console.log('Session:', session);
  console.log('Auth loading:', authLoading);
  console.log('==================');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [responseId, setResponseId] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'info' });
  const [completedSurveys, setCompletedSurveys] = useState([]);

  const showSnack = useCallback((msg, sev = 'info') => {
    setSnack({ open: true, msg: String(msg), sev });
  }, []);

  // Fetch surveys
  const fetchSurveys = useCallback(async () => {
    try {
      console.log('Fetching surveys...');
      const { data, error } = await supabase.from('surveys').select('*').eq('is_published', true).order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching surveys:', error);
        throw error;
      }

      console.log('Surveys fetched:', data);
      setSurveys(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error in fetchSurveys:', error);
      showSnack('Failed to load surveys: ' + String(error.message || error), 'error');
    }
  }, [showSnack]);

  // Fetch completed surveys
  const fetchCompletedSurveys = useCallback(async () => {
    if (!user?.id) {
      console.log('No user ID for fetching completed surveys');
      return;
    }

    try {
      console.log('Fetching completed surveys for user:', user.id);
      const { data, error } = await supabase
        .from('survey_responses')
        .select('survey_id')
        .eq('user_id', user.id)
        .not('submitted_at', 'is', null);

      if (error) {
        console.error('Error fetching completed surveys:', error);
        throw error;
      }

      console.log('Completed surveys fetched:', data);
      const completedIds = Array.isArray(data) ? data.map((r) => r.survey_id).filter((id) => id) : [];
      setCompletedSurveys(completedIds);
    } catch (error) {
      console.error('Error in fetchCompletedSurveys:', error);
    }
  }, [user?.id]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      console.log('Loading survey page data...');
      setLoading(true);
      try {
        await fetchSurveys();
        if (user?.id) {
          await fetchCompletedSurveys();
        }
      } catch (error) {
        console.error('Error loading survey data:', error);
      } finally {
        setLoading(false);
        console.log('Survey page data loading complete');
      }
    };

    loadData();
  }, [fetchSurveys, fetchCompletedSurveys, user?.id]);

  // Start survey
  const startSurvey = async (survey) => {
    console.log('Starting survey:', survey);

    if (!survey?.id || !user?.id) {
      console.error('Missing survey or user information:', { survey, user });
      showSnack('Missing survey or user information', 'error');
      return;
    }

    setLoading(true);

    try {
      // Check if already completed
      if (completedSurveys.includes(survey.id)) {
        console.log('Survey already completed');
        showSnack('You have already completed this survey', 'info');
        setLoading(false);
        return;
      }

      // Fetch questions
      console.log('Fetching questions for survey:', survey.id);
      const { data: questionsData, error: questionsError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', survey.id)
        .order('order_index');

      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
        throw questionsError;
      }

      if (!questionsData || questionsData.length === 0) {
        console.log('No questions found for survey');
        showSnack('No questions found for this survey', 'warning');
        setLoading(false);
        return;
      }

      console.log('Questions fetched:', questionsData);

      // Check for existing response
      console.log('Checking for existing response...');
      const { data: existingResponse, error: responseError } = await supabase
        .from('survey_responses')
        .select('id, submitted_at')
        .eq('survey_id', survey.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (responseError) {
        console.error('Error checking existing response:', responseError);
        throw responseError;
      }

      let currentResponseId = null;

      if (existingResponse) {
        console.log('Found existing response:', existingResponse);
        if (existingResponse.submitted_at) {
          showSnack('You have already completed this survey', 'info');
          setLoading(false);
          return;
        } else {
          currentResponseId = existingResponse.id;

          // Load existing answers
          console.log('Loading existing answers...');
          const { data: existingAnswers, error: answersError } = await supabase
            .from('survey_answers')
            .select('question_id, value')
            .eq('response_id', currentResponseId);

          if (!answersError && existingAnswers) {
            const answersMap = {};
            existingAnswers.forEach((answer) => {
              if (answer.question_id && answer.value !== undefined) {
                answersMap[answer.question_id] = answer.value;
              }
            });
            console.log('Existing answers loaded:', answersMap);
            setAnswers(answersMap);
          }
        }
      } else {
        // Create new response
        console.log('Creating new response...');
        const { data: newResponse, error: createError } = await supabase
          .from('survey_responses')
          .insert({
            survey_id: survey.id,
            user_id: user.id
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating response:', createError);
          throw createError;
        }

        console.log('New response created:', newResponse);
        currentResponseId = newResponse.id;
      }

      // Set survey state
      console.log('Setting up survey state...');
      setSelectedSurvey(survey);
      setQuestions(Array.isArray(questionsData) ? questionsData : []);
      setResponseId(currentResponseId);
      setCurrentStep(0);

      console.log('Survey started successfully');
    } catch (error) {
      console.error('Error starting survey:', error);
      showSnack('Failed to start survey: ' + String(error.message || error), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Save answer
  const saveAnswer = async (questionId, value) => {
    if (!responseId || !questionId) {
      console.log('Cannot save answer - missing responseId or questionId');
      return;
    }

    try {
      console.log('Saving answer:', { questionId, value, responseId });
      const { error } = await supabase.from('survey_answers').upsert(
        {
          response_id: responseId,
          question_id: questionId,
          value: String(value || '')
        },
        {
          onConflict: 'response_id,question_id'
        }
      );

      if (error) {
        console.error('Error saving answer:', error);
        throw error;
      }

      console.log('Answer saved successfully');
    } catch (error) {
      console.error('Error in saveAnswer:', error);
    }
  };

  // Handle answer change
  const handleAnswerChange = useCallback(
    (questionId, value) => {
      console.log('Answer changed:', { questionId, value });
      setAnswers((prev) => ({
        ...prev,
        [questionId]: value
      }));

      // Save after a delay
      setTimeout(() => {
        saveAnswer(questionId, value);
      }, 1000);
    },
    [responseId]
  );

  // Submit survey
  const submitSurvey = async () => {
    console.log('Submitting survey...');
    if (!responseId) {
      console.error('No response ID to submit');
      showSnack('No response to submit', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // Check required questions
      const requiredQuestions = questions.filter((q) => q.is_required);
      const unansweredRequired = requiredQuestions.filter((q) => {
        const answer = answers[q.id];
        return !answer || answer === '' || (Array.isArray(answer) && answer.length === 0);
      });

      if (unansweredRequired.length > 0) {
        console.log('Missing required answers:', unansweredRequired.length);
        showSnack(`Please answer all required questions (${unansweredRequired.length} remaining)`, 'warning');
        setSubmitting(false);
        return;
      }

      // Submit response
      console.log('Marking response as submitted...');
      const { error } = await supabase.from('survey_responses').update({ submitted_at: new Date().toISOString() }).eq('id', responseId);

      if (error) {
        console.error('Error submitting response:', error);
        throw error;
      }

      console.log('Survey submitted successfully');
      showSnack('Survey submitted successfully! Thank you for your feedback.', 'success');

      // Reset state
      setSelectedSurvey(null);
      setQuestions([]);
      setAnswers({});
      setCurrentStep(0);
      setResponseId(null);

      // Refresh data
      await fetchCompletedSurveys();
    } catch (error) {
      console.error('Error submitting survey:', error);
      showSnack('Failed to submit survey: ' + String(error.message || error), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Render question based on type
  const renderQuestion = (question) => {
    if (!question) return null;

    const value = answers[question.id] || '';
    const options = question.options ? (Array.isArray(question.options) ? question.options : []) : [];
    const metadata = question.metadata || {};

    switch (question.qtype) {
      case 'short_text':
        return (
          <TextField
            fullWidth
            variant="outlined"
            value={String(value || '')}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Enter your answer..."
            sx={{ mt: 2 }}
          />
        );

      case 'long_text':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={String(value || '')}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Enter your detailed answer..."
            sx={{ mt: 2 }}
          />
        );

      case 'single_choice':
        return (
          <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }}>
            <RadioGroup value={String(value || '')} onChange={(e) => handleAnswerChange(question.id, e.target.value)}>
              {options.map((option, index) => (
                <FormControlLabel key={index} value={String(option)} control={<Radio />} label={String(option)} sx={{ mb: 1 }} />
              ))}
            </RadioGroup>
          </FormControl>
        );

      case 'multiple_choice':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }}>
            <FormGroup>
              {options.map((option, index) => (
                <FormControlLabel
                  key={index}
                  control={
                    <Checkbox
                      checked={selectedValues.includes(option)}
                      onChange={(e) => {
                        let newValues;
                        if (e.target.checked) {
                          newValues = [...selectedValues, option];
                        } else {
                          newValues = selectedValues.filter((v) => v !== option);
                        }

                        const maxSelect = metadata.max_select;
                        if (maxSelect && newValues.length > maxSelect) {
                          showSnack(`You can select up to ${maxSelect} options`, 'warning');
                          return;
                        }

                        handleAnswerChange(question.id, newValues);
                      }}
                    />
                  }
                  label={String(option)}
                  sx={{ mb: 1 }}
                />
              ))}
            </FormGroup>
            {metadata.max_select && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                Select up to {metadata.max_select} options
              </Typography>
            )}
          </FormControl>
        );

      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            variant="outlined"
            value={Number(value) || 0}
            onChange={(e) => handleAnswerChange(question.id, parseFloat(e.target.value) || 0)}
            inputProps={{
              min: metadata.min || 0,
              max: metadata.max || 10,
              step: metadata.step || 1
            }}
            sx={{ mt: 2 }}
          />
        );

      case 'rating':
        const scaleMax = metadata.scale_max || 5;
        return (
          <Box sx={{ mt: 2 }}>
            <Rating
              value={Number(value) || 0}
              onChange={(e, newValue) => handleAnswerChange(question.id, newValue)}
              max={scaleMax}
              size="large"
            />
          </Box>
        );

      case 'boolean':
        return (
          <FormControl component="fieldset" sx={{ mt: 2 }}>
            <RadioGroup value={String(value || '')} onChange={(e) => handleAnswerChange(question.id, e.target.value === 'true')}>
              <FormControlLabel value="true" control={<Radio />} label="Yes" />
              <FormControlLabel value="false" control={<Radio />} label="No" />
            </RadioGroup>
          </FormControl>
        );

      default:
        return (
          <TextField
            fullWidth
            variant="outlined"
            value={String(value || '')}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            sx={{ mt: 2 }}
          />
        );
    }
  };

  const getProgress = () => {
    const totalQuestions = questions.length;
    const answeredQuestions = Object.keys(answers).filter((key) => {
      const answer = answers[key];
      return answer !== '' && answer !== null && answer !== undefined;
    }).length;
    return totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
  };

  if (loading || authLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '60vh', justifyContent: 'center' }}>
          <LinearProgress sx={{ width: '100%', maxWidth: 400, mb: 2 }} />
          <Typography variant="body2">Loading surveys...</Typography>
        </Box>
      </Container>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Card sx={{ textAlign: 'center', p: 4, borderRadius: 3 }}>
          <SurveyIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 2 }}>
            Authentication Required
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            You need to be logged in to access surveys. Please log in to continue.
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              // Navigate to login page
              window.location.href = '/login';
            }}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Go to Login
          </Button>
        </Card>
      </Container>
    );
  }

  if (!selectedSurvey) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <SurveyIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography
            variant="h3"
            sx={{
              mb: 2,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 600
            }}
          >
            Feedback & Surveys
          </Typography>
          <Typography variant="h6" color="textSecondary" sx={{ mb: 4 }}>
            Help us improve the SH&EM Portal by sharing your experience
          </Typography>
        </Box>

        {/* Debug Info */}
        {/* {process.env.NODE_ENV === 'development' && (
          <Card sx={{ mb: 3, backgroundColor: '#f5f5f5' }}>
            <CardContent>
              <Typography variant="h6">Debug Info:</Typography>
              <Typography variant="body2">User ID: {user?.id || 'Not logged in'}</Typography>
              <Typography variant="body2">User Email: {user?.email || 'No email'}</Typography>
              <Typography variant="body2">Session: {session ? 'Active' : 'None'}</Typography>
              <Typography variant="body2">Auth Loading: {authLoading.toString()}</Typography>
              <Typography variant="body2">Surveys Count: {surveys.length}</Typography>
              <Typography variant="body2">Completed Surveys: {completedSurveys.length}</Typography>
              <Typography variant="body2">Selected Survey: {selectedSurvey?.title || 'None'}</Typography>
              <Typography variant="body2">Questions: {questions.length}</Typography>
              <Typography variant="body2">Loading: {loading.toString()}</Typography>
            </CardContent>
          </Card>
        )} */}

        {/* Test Button to Create Sample Survey */}
        {process.env.NODE_ENV === 'development' && surveys.length === 0 && (
          <Card sx={{ mb: 3, backgroundColor: '#fff3e0' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>No Surveys Found - Create Test Data</Typography>
              <Button
                variant="contained"
                onClick={async () => {
                  try {
                    // Create a test survey
                    const { data: survey, error: surveyError } = await supabase
                      .from('surveys')
                      .insert({
                        title: 'Sample Feedback Survey',
                        description: 'Help us improve the energy management portal',
                        is_published: true
                      })
                      .select()
                      .single();

                    if (surveyError) throw surveyError;

                    // Create test questions
                    const questions = [
                      {
                        survey_id: survey.id,
                        question_text: 'How would you rate your overall experience?',
                        qtype: 'rating',
                        is_required: true,
                        order_index: 1,
                        metadata: { scale_max: 5 }
                      },
                      {
                        survey_id: survey.id,
                        question_text: 'Which features do you use most often?',
                        qtype: 'multiple_choice',
                        is_required: false,
                        order_index: 2,
                        options: ['Dashboard', 'Device Management', 'Reports', 'Settings']
                      },
                      {
                        survey_id: survey.id,
                        question_text: 'What improvements would you suggest?',
                        qtype: 'long_text',
                        is_required: false,
                        order_index: 3
                      }
                    ];

                    const { error: questionsError } = await supabase
                      .from('survey_questions')
                      .insert(questions);

                    if (questionsError) throw questionsError;

                    showSnack('Test survey created successfully!', 'success');
                    fetchSurveys();
                  } catch (error) {
                    console.error('Error creating test survey:', error);
                    showSnack('Failed to create test survey: ' + error.message, 'error');
                  }
                }}
              >
                Create Test Survey
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Surveys List */}
        <Stack spacing={3}>
          {surveys.map((survey) => {
            const isCompleted = completedSurveys.includes(survey.id);

            return (
              <Card
                key={survey.id}
                sx={{
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  border: isCompleted ? '2px solid #4caf50' : '1px solid #e0e0e0',
                  '&:hover': {
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Stack direction="row" alignItems="flex-start" spacing={3}>
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: 2,
                        background: isCompleted ? 'linear-gradient(45deg, #4caf50, #66bb6a)' : 'linear-gradient(45deg, #2196F3, #42a5f5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {isCompleted ? (
                        <CheckIcon sx={{ color: 'white', fontSize: 28 }} />
                      ) : (
                        <FeedbackIcon sx={{ color: 'white', fontSize: 28 }} />
                      )}
                    </Box>

                    <Box sx={{ flexGrow: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                          {String(survey.title || 'Untitled Survey')}
                        </Typography>
                        {isCompleted && <Chip label="Completed" color="success" size="small" icon={<CheckIcon />} />}
                      </Stack>

                      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                        {String(survey.description || 'No description available')}
                      </Typography>

                      <Button
                        variant={isCompleted ? 'outlined' : 'contained'}
                        startIcon={isCompleted ? <AnalyticsIcon /> : <ThumbUpIcon />}
                        onClick={async () => {
                          console.log('=== START SURVEY BUTTON CLICKED ===');
                          console.log('Survey:', survey);
                          console.log('User:', user);
                          console.log('Is Completed:', isCompleted);
                          
                          if (isCompleted) {
                            console.log('Survey already completed, not starting');
                            return;
                          }
                          
                          console.log('About to call startSurvey...');
                          await startSurvey(survey);
                          console.log('=== START SURVEY COMPLETED ===');
                        }}
                        disabled={isCompleted}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          px: 3,
                          py: 1.5
                        }}
                      >
                        {isCompleted ? 'Already Completed' : 'Start Survey'}
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>

        {/* No surveys message */}
        {surveys.length === 0 && (
          <Card sx={{ textAlign: 'center', p: 4, borderRadius: 3 }}>
            <SurveyIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              No surveys available at the moment
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Check back later for new feedback opportunities
            </Typography>
          </Card>
        )}
      </Container>
    );
  }

  // Survey taking interface
  console.log('=== RENDER DECISION ===');
  console.log('selectedSurvey:', selectedSurvey);
  console.log('questions:', questions);
  console.log('questions.length:', questions.length);
  console.log('currentStep:', currentStep);
  
  const currentQuestion = questions[currentStep];
  console.log('currentQuestion:', currentQuestion);
  
  const isLastQuestion = currentStep === questions.length - 1;
  const canProceed =
    currentQuestion &&
    (!currentQuestion.is_required ||
      (answers[currentQuestion.id] !== undefined && answers[currentQuestion.id] !== '' && answers[currentQuestion.id] !== null));

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <IconButton
                onClick={() => {
                  console.log('Closing survey');
                  setSelectedSurvey(null);
                  setQuestions([]);
                  setAnswers({});
                  setCurrentStep(0);
                  setResponseId(null);
                }}
                sx={{ mr: 1 }}
              >
                <CloseIcon />
              </IconButton>
              <Typography variant="h5" sx={{ fontWeight: 600, flexGrow: 1 }}>
                {String(selectedSurvey.title || 'Survey')}
              </Typography>
              <Chip label={`${currentStep + 1} of ${questions.length}`} variant="outlined" color="primary" />
            </Stack>

            <LinearProgress
              variant="determinate"
              value={getProgress()}
              sx={{
                height: 8,
                borderRadius: 4,
                mb: 2
              }}
            />

            <Typography variant="body2" color="textSecondary">
              Progress: {Math.round(getProgress())}% complete
            </Typography>
          </Box>

          {/* Question */}
          {currentQuestion && (
            <Box key={currentQuestion.id}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 4,
                  backgroundColor: 'grey.50',
                  borderRadius: 2
                }}
              >
                <Stack direction="row" alignItems="flex-start" spacing={2}>
                  {currentQuestion.is_required && <Chip label="Required" size="small" color="error" sx={{ mt: 0.5 }} />}
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {String(currentQuestion.question_text || 'Question')}
                  </Typography>
                </Stack>
              </Paper>

              {renderQuestion(currentQuestion)}
            </Box>
          )}

          {/* Navigation */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 4,
              pt: 3,
              borderTop: '1px solid',
              borderColor: 'grey.200'
            }}
          >
            <Button
              variant="outlined"
              startIcon={<PrevIcon />}
              onClick={() => {
                console.log('Previous button clicked');
                setCurrentStep(Math.max(0, currentStep - 1));
              }}
              disabled={currentStep === 0}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Previous
            </Button>

            {isLastQuestion ? (
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={() => {
                  console.log('Submit button clicked');
                  submitSurvey();
                }}
                disabled={!canProceed || submitting}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                {submitting ? 'Submitting...' : 'Submit Survey'}
              </Button>
            ) : (
              <Button
                variant="contained"
                endIcon={<NextIcon />}
                onClick={() => {
                  console.log('Next button clicked');
                  setCurrentStep(Math.min(questions.length - 1, currentStep + 1));
                }}
                disabled={!canProceed}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Next
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={6000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.sev} variant="filled" sx={{ width: '100%', borderRadius: 2 }}>
          {String(snack.msg)}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SurveyPage;
