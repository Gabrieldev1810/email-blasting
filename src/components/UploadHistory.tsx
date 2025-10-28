import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, FileText, RefreshCw, Eye, Upload, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from 'date-fns';

const UploadHistory = () => {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/contacts/uploads', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setUploads(result.data || []);
      } else {
        setError('Failed to load upload history');
      }
    } catch (err) {
      setError('Error loading uploads: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      success: 'default',
      partial: 'secondary', 
      failed: 'destructive',
      processing: 'outline'
    };

    return (
      <Badge variant={variants[status] || 'outline'} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'excel':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'csv':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'manual':
        return <Upload className="h-4 w-4 text-purple-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const downloadFile = async (uploadId, filename) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/contacts/uploads/${uploadId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Failed to download file');
      }
    } catch (err) {
      setError('Download error: ' + err.message);
    }
  };

  const viewUploadDetails = async (uploadId) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/contacts/uploads/${uploadId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setSelectedUpload(result.data);
      } else {
        setError('Failed to load upload details');
      }
    } catch (err) {
      setError('Error loading details: ' + err.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading upload history...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload History
          </CardTitle>
          <CardDescription>
            View and manage your contact file uploads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {uploads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No uploads found. Start by uploading a contact file.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Statistics</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(upload.upload_type)}
                        <div>
                          <div className="font-medium">{upload.original_filename}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatFileSize(upload.file_size)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {upload.upload_type?.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(upload.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Total: {upload.total_rows}</div>
                        <div className="text-green-600">Success: {upload.processed_rows}</div>
                        {upload.failed_rows > 0 && (
                          <div className="text-red-600">Failed: {upload.failed_rows}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {upload.uploaded_at && format(new Date(upload.uploaded_at), 'PPp')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewUploadDetails(upload.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Upload Details</DialogTitle>
                              <DialogDescription>
                                Detailed information about this upload
                              </DialogDescription>
                            </DialogHeader>
                            {selectedUpload && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-medium">File Information</h4>
                                    <div className="text-sm space-y-1 mt-2">
                                      <div>Name: {selectedUpload.original_filename}</div>
                                      <div>Size: {formatFileSize(selectedUpload.file_size)}</div>
                                      <div>Type: {selectedUpload.upload_type}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-medium">Processing Statistics</h4>
                                    <div className="text-sm space-y-1 mt-2">
                                      <div>Total Rows: {selectedUpload.total_rows}</div>
                                      <div>Processed: {selectedUpload.processed_rows}</div>
                                      <div>Failed: {selectedUpload.failed_rows}</div>
                                    </div>
                                  </div>
                                </div>
                                
                                {selectedUpload.errors && selectedUpload.errors.length > 0 && (
                                  <div>
                                    <h4 className="font-medium text-red-600">Errors</h4>
                                    <div className="bg-red-50 p-3 rounded mt-2 max-h-40 overflow-y-auto">
                                      {selectedUpload.errors.map((error, index) => (
                                        <div key={index} className="text-sm text-red-700">
                                          {error.message || error}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {selectedUpload.metadata && (
                                  <div>
                                    <h4 className="font-medium">Metadata</h4>
                                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                                      {JSON.stringify(selectedUpload.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        {upload.file_path && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadFile(upload.id, upload.original_filename)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" onClick={fetchUploads}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadHistory;