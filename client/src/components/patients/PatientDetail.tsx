import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Box,
  Paper,
  Divider,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Cake as CakeIcon,
  Assignment as AssignmentIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { format, parseISO, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Patient } from '../../types/patient';

interface PatientDetailProps {
  open: boolean;
  onClose: () => void;
  onEdit?: (patient: Patient) => void;
  patient: Patient | null;
}

const PatientDetail: React.FC<PatientDetailProps> = ({
  open,
  onClose,
  onEdit,
  patient,
}) => {
  if (!patient) return null;

  const getPatientAge = (birthDate: string) => {
    return differenceInYears(new Date(), parseISO(birthDate));
  };

  const getPatientInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatAddress = () => {
    if (!patient.address) return 'Não informado';
    
    const { street, number, complement, neighborhood, city, state, zip_code } = patient.address;
    return `${street}, ${number}${complement ? ` - ${complement}` : ''}, ${neighborhood}, ${city} - ${state}, ${zip_code}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
              {getPatientInitials(patient.first_name, patient.last_name)}
            </Avatar>
            <Box>
              <Typography variant="h6">
                {patient.first_name} {patient.last_name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                ID: {patient.patient_id}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {onEdit && (
              <IconButton onClick={() => onEdit(patient)}>
                <EditIcon />
              </IconButton>
            )}
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Personal Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon color="primary" />
                  Informações Pessoais
                </Typography>
                
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CakeIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Idade"
                      secondary={`${getPatientAge(patient.birth_date)} anos (${format(parseISO(patient.birth_date), 'dd/MM/yyyy', { locale: ptBR })})`}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <PhoneIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Telefone"
                      secondary={patient.phone}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <EmailIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Email"
                      secondary={patient.email}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <LocationIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Endereço"
                      secondary={formatAddress()}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Statistics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon color="primary" />
                  Estatísticas
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {patient.treatment_history.length}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Tratamentos
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {patient.medical_history.length}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Histórico Médico
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Paciente desde: {format(parseISO(patient.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </Typography>
                  {patient.updated_at && (
                    <Typography variant="body2" color="textSecondary">
                      Última atualização: {format(parseISO(patient.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Treatment History */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon color="primary" />
                  Histórico de Tratamentos
                </Typography>
                
                {patient.treatment_history.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
                    Nenhum tratamento realizado ainda.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {patient.treatment_history.map((requestId, index) => (
                      <Chip
                        key={requestId}
                        label={`Tratamento ${index + 1}`}
                        variant="outlined"
                        color="primary"
                        size="small"
                        icon={<CalendarIcon />}
                      />
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Medical History */}
          {patient.medical_history.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Histórico Médico
                  </Typography>
                  
                  <List>
                    {patient.medical_history.map((entry, index) => (
                      <React.Fragment key={index}>
                        <ListItem alignItems="flex-start">
                          <ListItemIcon>
                            <CalendarIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" fontWeight="medium">
                                  {format(parseISO(entry.date), 'dd/MM/yyyy', { locale: ptBR })}
                                </Typography>
                                <Chip label={entry.doctor} size="small" variant="outlined" />
                              </Box>
                            }
                            secondary={entry.description}
                          />
                        </ListItem>
                        {index < patient.medical_history.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Fechar
        </Button>
        {onEdit && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => onEdit(patient)}
          >
            Editar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PatientDetail;