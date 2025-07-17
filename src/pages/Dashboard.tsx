import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import { Plus, QrCode, Link2, Download, Users, MoreHorizontal, Play, Pause, Square } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import * as XLSX from 'xlsx'

interface Space {
  id: string
  title: string
  type: string
  unique_code: string
  public_link: string
  status: string
  created_at: string
  start_time?: string
  end_time?: string
  submission_count?: number
}

interface AttendanceRecord {
  id: string
  fields: any
  submitted_at: string
  user_id?: string
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [recordsLoading, setRecordsLoading] = useState(false)

  useEffect(() => {
    fetchSpaces()
  }, [])

  const fetchSpaces = async () => {
    if (!user) return

    try {
      // Fetch spaces with submission counts
      const { data: spacesData, error: spacesError } = await supabase
        .from('spaces')
        .select(`
          *,
          attendance_records(count)
        `)
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false })

      if (spacesError) throw spacesError

      const spacesWithCounts = spacesData.map((space: any) => ({
        ...space,
        submission_count: space.attendance_records?.[0]?.count || 0
      }))

      setSpaces(spacesWithCounts)
    } catch (error) {
      console.error('Error fetching spaces:', error)
      toast({ title: 'Error', description: 'Failed to load spaces', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceRecords = async (spaceId: string) => {
    setRecordsLoading(true)
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('space_id', spaceId)
        .order('submitted_at', { ascending: false })

      if (error) throw error
      setAttendanceRecords(data as AttendanceRecord[])
    } catch (error) {
      console.error('Error fetching attendance records:', error)
      toast({ title: 'Error', description: 'Failed to load attendance records', variant: 'destructive' })
    } finally {
      setRecordsLoading(false)
    }
  }

  const updateSpaceStatus = async (spaceId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('spaces')
        .update({ status })
        .eq('id', spaceId)

      if (error) throw error

      setSpaces(spaces.map(space => 
        space.id === spaceId ? { ...space, status } : space
      ))

      if (selectedSpace?.id === spaceId) {
        setSelectedSpace({ ...selectedSpace, status })
      }

      toast({ title: 'Success', description: `Space ${status} successfully` })
    } catch (error) {
      console.error('Error updating space status:', error)
      toast({ title: 'Error', description: 'Failed to update space status', variant: 'destructive' })
    }
  }

  const exportToExcel = (space: Space, records: AttendanceRecord[]) => {
    if (records.length === 0) {
      toast({ title: 'No Data', description: 'No attendance records to export' })
      return
    }

    // Get all unique field names from records
    const allFields = new Set<string>()
    records.forEach(record => {
      Object.keys(record.fields).forEach(field => allFields.add(field))
    })

    // Create worksheet data
    const wsData = [
      ['Submitted At', 'User ID', ...Array.from(allFields)], // Header row
      ...records.map(record => [
        new Date(record.submitted_at).toLocaleString(),
        record.user_id || 'Anonymous',
        ...Array.from(allFields).map(field => record.fields[field] || '')
      ])
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Records')

    // Download file
    const fileName = `${space.title.replace(/[^a-zA-Z0-9]/g, '_')}_attendance_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)

    toast({ title: 'Success', description: 'Attendance records exported successfully' })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied', description: 'Link copied to clipboard!' })
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open': return 'default'
      case 'paused': return 'secondary'
      case 'closed': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return Play
      case 'paused': return Pause
      case 'closed': return Square
      default: return Pause
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Manage your attendance spaces</p>
        </div>
        <Button onClick={() => navigate('/create-space')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Space
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Spaces Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Your Attendance Spaces</CardTitle>
            <CardDescription>
              {spaces.length} space{spaces.length !== 1 ? 's' : ''} created
            </CardDescription>
          </CardHeader>
          <CardContent>
            {spaces.length === 0 ? (
              <div className="text-center py-8">
                <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No attendance spaces yet</p>
                <Button onClick={() => navigate('/create-space')}>
                  Create Your First Space
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {spaces.map((space) => {
                  const StatusIcon = getStatusIcon(space.status)
                  return (
                    <div key={space.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{space.title}</h3>
                          <Badge variant={getStatusBadgeVariant(space.status)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {space.status}
                          </Badge>
                          <Badge variant="outline">{space.type}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Code: {space.unique_code}</span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {space.submission_count} submissions
                          </span>
                          <span>Created: {new Date(space.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(space.public_link)}
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSpace(space)
                            fetchAttendanceRecords(space.id)
                          }}
                        >
                          View Records
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {space.status !== 'open' && (
                              <DropdownMenuItem onClick={() => updateSpaceStatus(space.id, 'open')}>
                                <Play className="h-4 w-4 mr-2" />
                                Open
                              </DropdownMenuItem>
                            )}
                            {space.status !== 'paused' && (
                              <DropdownMenuItem onClick={() => updateSpaceStatus(space.id, 'paused')}>
                                <Pause className="h-4 w-4 mr-2" />
                                Pause
                              </DropdownMenuItem>
                            )}
                            {space.status !== 'closed' && (
                              <DropdownMenuItem onClick={() => updateSpaceStatus(space.id, 'closed')}>
                                <Square className="h-4 w-4 mr-2" />
                                Close
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Records */}
        {selectedSpace && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Attendance Records - {selectedSpace.title}</CardTitle>
                  <CardDescription>
                    {attendanceRecords.length} submission{attendanceRecords.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => exportToExcel(selectedSpace, attendanceRecords)}
                    disabled={attendanceRecords.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Excel
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedSpace(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {recordsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : attendanceRecords.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No attendance records yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Submitted At</TableHead>
                        <TableHead>User ID</TableHead>
                        {/* Dynamic headers based on submitted fields */}
                        {Object.keys(attendanceRecords[0]?.fields || {}).map((field) => (
                          <TableHead key={field} className="capitalize">
                            {field.replace(/_/g, ' ')}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {new Date(record.submitted_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {record.user_id ? (
                              <Badge variant="outline">User</Badge>
                            ) : (
                              <Badge variant="secondary">Anonymous</Badge>
                            )}
                          </TableCell>
                          {Object.values(record.fields).map((value, index) => (
                            <TableCell key={index}>{String(value)}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}