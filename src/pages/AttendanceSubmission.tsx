import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface Space {
  id: string
  title: string
  type: string
  required_fields: any
  status: string
  start_time?: string
  end_time?: string
}

interface CustomField {
  id: string
  name: string
  type: 'text' | 'email' | 'number'
  required: boolean
}

interface SubmissionData {
  [key: string]: string
}

export default function AttendanceSubmission() {
  const { code } = useParams<{ code: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [space, setSpace] = useState<Space | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<SubmissionData>()

  useEffect(() => {
    const fetchSpace = async () => {
      if (!code) {
        setError('Invalid attendance code')
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('spaces')
          .select('*')
          .eq('unique_code', code)
          .single()

        if (error) throw error

        if (data.status !== 'open') {
          setError(`This attendance session is ${data.status}`)
          setSpace({
            ...data,
            required_fields: Array.isArray(data.required_fields) ? data.required_fields : []
          })
          setLoading(false)
          return
        }

        // Check if session has ended
        if (data.end_time && new Date(data.end_time) < new Date()) {
          setError('This attendance session has ended')
          setSpace({
            ...data,
            required_fields: Array.isArray(data.required_fields) ? data.required_fields : []
          })
          setLoading(false)
          return
        }

        setSpace({
          ...data,
          required_fields: Array.isArray(data.required_fields) ? data.required_fields : []
        })
        
        // Pre-fill form with user data if available
        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

          if (userData) {
            const defaultValues: SubmissionData = {
              name: userData.full_name || '',
              email: userData.email || '',
            }
            form.reset(defaultValues)
          }
        }
      } catch (err) {
        console.error('Error fetching space:', err)
        setError('Attendance session not found')
      } finally {
        setLoading(false)
      }
    }

    fetchSpace()
  }, [code, user, form])

  const onSubmit = async (data: SubmissionData) => {
    if (!space) return

    setIsSubmitting(true)
    try {
      const submissionData = {
        space_id: space.id,
        user_id: user?.id || null,
        fields: data,
      }

      const { error } = await supabase
        .from('attendance_records')
        .insert(submissionData)

      if (error) throw error

      setSubmitted(true)
      toast({ title: 'Success', description: 'Attendance submitted successfully!' })
    } catch (err) {
      console.error('Error submitting attendance:', err)
      toast({ title: 'Error', description: 'Failed to submit attendance', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-md">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading attendance form...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-md">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Unable to Submit Attendance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            {space && (
              <div className="text-sm text-muted-foreground">
                <p><strong>Session:</strong> {space.title}</p>
                <p><strong>Type:</strong> {space.type}</p>
                <p><strong>Status:</strong> {space.status}</p>
              </div>
            )}
            <Button onClick={() => navigate('/')} className="w-full mt-4">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="container mx-auto p-6 max-w-md">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <CardTitle>Attendance Submitted</CardTitle>
            </div>
            <CardDescription>
              Thank you for attending {space?.title}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground">
                Your attendance has been recorded successfully.
              </p>
            </div>
            <Button onClick={() => navigate('/')} className="w-full">
              Done
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!space) return null

  return (
    <div className="container mx-auto p-6 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{space.title}</CardTitle>
          <CardDescription>
            {space.type} • Please fill in your details to mark attendance
          </CardDescription>
          {space.end_time && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Ends at {new Date(space.end_time).toLocaleString()}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Always include name and email as default fields */}
              <FormField
                control={form.control}
                name="name"
                rules={{ required: 'Name is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                rules={{ 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Render custom fields */}
              {(space.required_fields as CustomField[]).map((customField) => (
                <FormField
                  key={customField.id}
                  control={form.control}
                  name={customField.name.toLowerCase().replace(/\s+/g, '_')}
                  rules={customField.required ? { required: `${customField.name} is required` } : undefined}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {customField.name} {customField.required && '*'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type={customField.type}
                          placeholder={`Enter your ${customField.name.toLowerCase()}`}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Submitting...' : 'Submit Attendance'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}