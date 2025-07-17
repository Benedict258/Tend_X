import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Plus, X, QrCode, Link2, Copy } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import QRCode from 'qrcode'

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['Class', 'Event', 'Custom']),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface CustomField {
  id: string
  name: string
  type: 'text' | 'email' | 'number'
  required: boolean
}

export default function CreateSpace() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<'text' | 'email' | 'number'>('text')
  const [createdSpace, setCreatedSpace] = useState<{
    id: string
    title: string
    uniqueCode: string
    publicLink: string
    qrCode: string
  } | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      type: 'Class',
    },
  })

  const addCustomField = () => {
    if (!newFieldName.trim()) return
    
    const field: CustomField = {
      id: Date.now().toString(),
      name: newFieldName.trim(),
      type: newFieldType,
      required: true,
    }
    
    setCustomFields([...customFields, field])
    setNewFieldName('')
  }

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(field => field.id !== id))
  }

  const generateUniqueCode = () => {
    return 'TEND-' + Math.random().toString(36).substr(2, 5).toUpperCase()
  }

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to create a space', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    
    try {
      const uniqueCode = generateUniqueCode()
      const publicLink = `${window.location.origin}/attend/${uniqueCode}`
      
      // Generate QR Code
      const qrCodeDataUrl = await QRCode.toDataURL(publicLink, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      const spaceData = {
        title: data.title,
        type: data.type,
        admin_id: user.id,
        required_fields: JSON.stringify(customFields),
        unique_code: uniqueCode,
        public_link: publicLink,
        qr_code: qrCodeDataUrl,
        start_time: data.startTime ? new Date(data.startTime).toISOString() : null,
        end_time: data.endTime ? new Date(data.endTime).toISOString() : null,
      }

      const { data: space, error } = await supabase
        .from('spaces')
        .insert(spaceData)
        .select()
        .single()

      if (error) throw error

      setCreatedSpace({
        id: space.id,
        title: space.title,
        uniqueCode: space.unique_code,
        publicLink: space.public_link,
        qrCode: space.qr_code,
      })

      toast({ title: 'Success', description: 'Attendance space created successfully!' })
    } catch (error) {
      console.error('Error creating space:', error)
      toast({ title: 'Error', description: 'Failed to create attendance space', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied', description: 'Link copied to clipboard!' })
  }

  if (createdSpace) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-primary">Space Created Successfully!</CardTitle>
            <CardDescription className="text-center">
              Your attendance space "{createdSpace.title}" is now ready
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="inline-block p-4 bg-muted rounded-lg">
                <img src={createdSpace.qrCode} alt="QR Code" className="mx-auto" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Scan this QR code to attend</p>
            </div>
            
            <div>
              <label className="text-sm font-medium">Unique Code:</label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={createdSpace.uniqueCode} readOnly />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(createdSpace.uniqueCode)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Public Link:</label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={createdSpace.publicLink} readOnly />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(createdSpace.publicLink)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={() => navigate('/dashboard')} className="flex-1">
                View Dashboard
              </Button>
              <Button variant="outline" onClick={() => setCreatedSpace(null)} className="flex-1">
                Create Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Create Attendance Space</CardTitle>
          <CardDescription>
            Set up a new attendance tracking session for your class, event, or custom use case
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Computer Science 101, Company Meeting" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Class">Class</SelectItem>
                        <SelectItem value="Event">Event</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time (Optional)</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time (Optional)</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormLabel>Custom Fields</FormLabel>
                <FormDescription>
                  Add additional fields that attendees will need to fill (e.g., Student ID, Department)
                </FormDescription>
                
                <div className="mt-2 space-y-2">
                  {customFields.map((field) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Badge variant="secondary" className="flex-1 justify-between">
                        <span>{field.name} ({field.type})</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomField(field.id)}
                          className="h-auto p-1 ml-2"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex gap-2">
                  <Input
                    placeholder="Field name"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomField())}
                  />
                  <Select value={newFieldType} onValueChange={(value: 'text' | 'email' | 'number') => setNewFieldType(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={addCustomField}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Creating...' : 'Create Space'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}