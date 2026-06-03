// src/screens/Admin/components/CustomerSearchInput.tsx
// Typeahead search input for finding active customers
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Search, User, X } from 'lucide-react-native';
import { useLazyAdminSearchCustomersQuery } from '../../../features/api/apiSlice';

interface CustomerResult {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
}

interface CustomerSearchInputProps {
  onSelectCustomer: (customer: CustomerResult) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CustomerSearchInput: React.FC<CustomerSearchInputProps> = ({
  onSelectCustomer,
  placeholder = 'ابحثي عن عميلة...',
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const [triggerSearch, { data, isLoading, isFetching, error }] = useLazyAdminSearchCustomersQuery();

  const customers = data?.customers || [];
  const isSearching = isLoading || isFetching;

  // Log response data (dev only — never log PII in release builds)
  useEffect(() => {
    if (__DEV__) {
      if (data) {
        console.log('[CustomerSearchInput] received response', {
          ok: data.ok,
          customersCount: data.customers?.length,
        });
      }
      if (error) {
        console.log('[CustomerSearchInput] received error');
      }
    }
  }, [data, error]);

  // Debounced search
  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (text.length >= 1) {
      debounceRef.current = setTimeout(() => {
        if (__DEV__) {
          console.log('[CustomerSearchInput] triggering search', { len: text.length, limit: 15 });
        }
        triggerSearch({ q: text, limit: 15 });
      }, 300);
    }
  }, [triggerSearch]);

  // Show dropdown when focused, has query, and either loading or has results
  useEffect(() => {
    const shouldShow = isFocused && query.length >= 1;
    setShowDropdown(shouldShow);
  }, [isFocused, query]);

  const handleSelectCustomer = useCallback((customer: CustomerResult) => {
    onSelectCustomer(customer);
    setQuery('');
    setShowDropdown(false);
  }, [onSelectCustomer]);

  const handleClear = useCallback(() => {
    setQuery('');
    setShowDropdown(false);
  }, []);

  const handleBlur = useCallback(() => {
    // Delay to allow press on dropdown items
    setTimeout(() => {
      setIsFocused(false);
      setShowDropdown(false);
    }, 200);
  }, []);

  return (
    <View style={{ position: 'relative', zIndex: 100 }}>
      {/* Search Input */}
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          backgroundColor: '#f9fafb',
          borderWidth: 1,
          borderColor: isFocused ? '#8b5cf6' : '#e5e7eb',
          borderRadius: 12,
          paddingHorizontal: 12,
        }}
      >
        <Search size={18} color="#9ca3af" />
        <TextInput
          value={query}
          onChangeText={handleQueryChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          editable={!disabled}
          style={{
            flex: 1,
            paddingVertical: 14,
            paddingHorizontal: 10,
            fontSize: 15,
            color: '#1f2937',
            textAlign: 'right',
          }}
        />
        {query.length > 0 && (
          <Pressable onPress={handleClear} style={{ padding: 4 }}>
            <X size={18} color="#9ca3af" />
          </Pressable>
        )}
      </View>

      {/* Dropdown */}
      {showDropdown && (
        <View
          style={{
            position: 'absolute',
            top: 56,
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            maxHeight: 240,
            zIndex: 1000,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
              },
              android: {
                elevation: 8,
              },
            }),
          }}
        >
          {isSearching ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#8b5cf6" />
              <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>جارٍ البحث...</Text>
            </View>
          ) : error ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#ef4444', textAlign: 'center' }}>
                حدث خطأ في البحث
              </Text>
              <Pressable
                onPress={() => triggerSearch({ q: query, limit: 15 })}
                style={{ marginTop: 8 }}
              >
                <Text style={{ fontSize: 13, color: '#8b5cf6' }}>إعادة المحاولة</Text>
              </Pressable>
            </View>
          ) : customers.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#9ca3af' }}>لا توجد نتائج</Text>
            </View>
          ) : (
            customers.map((customer, index) => (
              <Pressable
                key={customer.id}
                onPress={() => handleSelectCustomer(customer)}
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  padding: 12,
                  borderBottomWidth: index < customers.length - 1 ? 1 : 0,
                  borderBottomColor: '#f3f4f6',
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#f3e8ff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 10,
                  }}
                >
                  <User size={18} color="#8b5cf6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#1f2937',
                      textAlign: 'right',
                    }}
                    numberOfLines={1}
                  >
                    {customer.fullName}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#6b7280',
                      textAlign: 'right',
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {customer.email}
                    {customer.phone ? ` • ${customer.phone}` : ''}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  );
};

export default CustomerSearchInput;
