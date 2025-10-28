import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Divider,
  InputAdornment,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationCity as LocationCityIcon,
  Edit as EditIcon,
  People as PeopleIcon,
  LocalHospital as PatientIcon,
  Inventory as ProductIcon,
  Timeline as ActivityIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import clinicService, { Clinic, ClinicStats, User, UpdateClinicRequest, CreateUserRequest } from '../services/clinicService';
import { validateBrazilianPhone, formatBrazilianPhone, extractCityFromAddress } from '../utils/brazilianValidation';

const ClinicManagementPage: React.FC = () => {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [stats, setStats] = useState<ClinicStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    timezone: 'America/Sao_Paulo',
    low_stock_alerts: true,
    expiration_alerts: true,
    email_notifications: true,
    alert_threshold_days: 30,
  });

  // User management
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    role: 'clinic_user' as 'clinic_admin' | 'clinic_user',
    first_name: '',
    last_name: '',
    phone: '',
  });

  const loadClinicData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [clinicData, statsData, usersData] = await Promise.all([
        clinicService.getCurrentClinic(),
        clinicService.getCurrentClinicStats(),
        clinicService.getCurrentClinicUsers(),
      ]);

      setClinic(clinicData);
      setStats(statsData);
      setUsers(usersData);

      // Update form data
      setFormData({
        name: clinicData.name,
        email: clinicData.email || '',
        phone: clinicData.phone || '',
        address: clinicData.address,
        city: clinicData.city || '',
        timezone: clinicData.settings.timezone,
        low_stock_alerts: clinicData.settings.notification_preferences.low_stock_alerts,
        expiration_alerts: clinicData.settings.notification_preferences.expiration_alerts,
        email_notifications: clinicData.settings.notification_preferences.email_notifications,
        alert_threshold_days: clinicData.settings.notification_preferences.alert_threshold_days,
      });
    } catch (error: any) {
      console.error('Error loading clinic data:', error);
      setError(error.message || 'Falha ao carregar dados da clínica');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinicData();
  }, []);

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    let value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    
    // Apply formatting for specific fields
    if (field === 'phone' && typeof value === 'string') {
      value = formatBrazilianPhone(value);
    } else if (field