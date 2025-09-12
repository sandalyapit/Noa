import React, { useState } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import { Checkbox } from './ui/Checkbox';

/**
 * Dynamic Form Generator based on spreadsheet schema
 * Generates form fields based on detected column types
 */
const DynamicFormGenerator = ({ sheetSchema = [], onSubmit, disabled = false }) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear error when user starts typing
    if (errors?.[fieldName]) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    sheetSchema?.forEach(column => {
      const value = formData?.[column?.name];
      const isEmpty = !value || String(value)?.trim() === '';
      
      // Check required fields (non-empty columns might be required)
      if (column?.stats?.nonEmpty > 0 && isEmpty) {
        newErrors[column.name] = `${column?.name} appears to be required based on existing data`;
      }
      
      // Type-specific validation
      if (!isEmpty) {
        switch (column?.dataType?.type) {
          case 'number':
            if (isNaN(Number(value))) {
              newErrors[column.name] = 'Must be a valid number';
            }
            break;
          case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex?.test(value)) {
              newErrors[column.name] = 'Must be a valid email address';
            }
            break;
          case 'url':
            try {
              new URL(value);
            } catch {
              newErrors[column.name] = 'Must be a valid URL';
            }
            break;
          case 'date':
            if (isNaN(Date.parse(value))) {
              newErrors[column.name] = 'Must be a valid date';
            }
            break;
          default:
            break;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit?.(formData);
      
      // Clear form on successful submit
      setFormData({});
      setErrors({});
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ 
        _general: error?.message || 'Failed to submit form'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormField = (column) => {
    const { name, dataType, inputType, stats } = column;
    const value = formData?.[name] || '';
    const error = errors?.[name];
    const fieldId = `field-${name?.replace(/\s+/g, '-')?.toLowerCase()}`;
    
    const commonProps = {
      id: fieldId,
      value,
      onChange: (e) => handleInputChange(name, e?.target?.value),
      disabled: disabled || isSubmitting,
      className: error ? 'border-red-500' : ''
    };

    const renderInput = () => {
      switch (inputType) {
        case 'checkbox':
          return (
            <Checkbox
              {...commonProps}
              checked={value === 'true' || value === true}
              onChange={(e) => handleInputChange(name, e?.target?.checked)}
              className="mt-1"
            />
          );
          
        case 'number':
          return (
            <Input
              {...commonProps}
              type="number"
              placeholder={`Enter ${name?.toLowerCase()}`}
              step={dataType?.type === 'number' ? 'any' : undefined}
            />
          );
          
        case 'email':
          return (
            <Input
              {...commonProps}
              type="email"
              placeholder={`Enter ${name?.toLowerCase()}`}
            />
          );
          
        case 'url':
          return (
            <Input
              {...commonProps}
              type="url"
              placeholder={`Enter ${name?.toLowerCase()}`}
            />
          );
          
        case 'date':
          return (
            <Input
              {...commonProps}
              type="date"
            />
          );
          
        default:
          return (
            <Input
              {...commonProps}
              type="text"
              placeholder={`Enter ${name?.toLowerCase()}`}
              maxLength={1000}
            />
          );
      }
    };

    return (
      <div key={name} className="space-y-2">
        <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
          {name}
          {stats?.nonEmpty > 0 && (
            <span className="ml-1 text-xs text-gray-500">
              ({stats?.nonEmpty} entries)
            </span>
          )}
          {dataType?.confidence < 0.7 && (
            <span className="ml-1 text-xs text-yellow-600" title="Data type detection uncertain">
              ⚠️
            </span>
          )}
        </label>
        {renderInput()}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {stats?.sampleValues?.length > 0 && (
          <p className="text-xs text-gray-500">
            Examples: {stats?.sampleValues?.slice(0, 3)?.join(', ')}
          </p>
        )}
      </div>
    );
  };

  if (!sheetSchema?.length) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No schema available to generate form</p>
        <p className="text-sm">Please select and analyze a spreadsheet first</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sheetSchema?.map(renderFormField)}
      </div>
      {errors?._general && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errors?._general}</p>
        </div>
      )}
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setFormData({});
            setErrors({});
          }}
          disabled={disabled || isSubmitting}
        >
          Clear Form
        </Button>
        
        <Button
          type="submit"
          disabled={disabled || isSubmitting || sheetSchema?.length === 0}
          className="min-w-[100px]"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Adding...
            </>
          ) : (
            'Add Row'
          )}
        </Button>
      </div>
      <div className="text-xs text-gray-500 space-y-1">
        <p>💡 Form fields are generated based on detected column types</p>
        <p>⚠️ Yellow warning icons indicate uncertain data type detection</p>
        <p>🔒 Required fields are suggested based on existing data patterns</p>
      </div>
    </form>
  );
};

export default DynamicFormGenerator;