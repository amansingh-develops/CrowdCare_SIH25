import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'hi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

// Translation data
const translations = {
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.cancel': 'Cancel',
    'common.submit': 'Submit',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.view': 'View',
    'common.refresh': 'Refresh',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.actions': 'Actions',
    'common.status': 'Status',
    'common.date': 'Date',
    'common.time': 'Time',
    'common.location': 'Location',
    'common.category': 'Category',
    'common.description': 'Description',
    'common.title': 'Title',
    'common.reporter': 'Reporter',
    'common.urgency': 'Urgency',
    'common.logout': 'Logout',
    'common.exit': 'Exit',
    'common.language': 'Language',
    'common.english': 'English',
    'common.hindi': 'हिंदी',

    // Landing Page
    'landing.title': 'CrowdCare',
    'landing.subtitle': 'Empowering communities to report and resolve local issues through AI-powered insights',
    'landing.chooseRole': 'Choose Your Role',
    'landing.roleDescription': 'Select how you\'d like to participate in improving your community',
    'landing.citizen': 'Citizen',
    'landing.citizenDescription': 'Report issues in your community and track their resolution',
    'landing.admin': 'Admin',
    'landing.adminDescription': 'Manage and prioritize community issues for efficient resolution',
    'landing.continueAsCitizen': 'Continue as Citizen',
    'landing.continueAsAdmin': 'Continue as Admin',
    'landing.howItWorks': 'How CrowdCare Works',
    'landing.step1': 'Report Issues',
    'landing.step1Desc': 'Citizens capture photos with automatic GPS location and AI-generated descriptions',
    'landing.step2': 'AI Analysis',
    'landing.step2Desc': 'Our AI analyzes reports to determine urgency and generate actionable insights',
    'landing.step3': 'Resolution',
    'landing.step3Desc': 'Admins prioritize and manage issues for efficient community improvement',

    // Citizen Features
    'citizen.reportWithPhotos': 'Report local issues with photos',
    'citizen.gpsDetection': 'Automatic GPS location detection',
    'citizen.aiDescriptions': 'AI-powered issue descriptions',
    'citizen.trackProgress': 'Track issue resolution progress',
    'citizen.urgencyRanking': 'AI-powered urgency ranking',
    'citizen.advancedFiltering': 'Advanced filtering and sorting',
    'citizen.resolutionManagement': 'Issue resolution management',
    'citizen.communityInsights': 'Community insights and reports',

    // Citizen Dashboard
    'citizen.welcome': 'Welcome to CrowdCare',
    'citizen.welcomeDesc': 'Help improve your community by reporting issues and tracking their resolution.',
    'citizen.dashboard': 'Citizen Dashboard',
    'citizen.reportIssue': 'Report an Issue',
    'citizen.reportIssueDesc': 'Report local issues with AI-powered descriptions',
    'citizen.trackReports': 'Track Reports',
    'citizen.trackReportsDesc': 'Monitor the status of your submitted reports',
    'citizen.community': 'Community',
    'citizen.communityDesc': 'View issues reported by other citizens',

    // Report Form
    'report.title': 'Report an Issue',
    'report.description': 'Report local issues with AI-powered descriptions and automatic location detection.',
    'report.category': 'Category',
    'report.categoryPlaceholder': 'Select issue category',
    'report.photo': 'Photo',
    'report.cameraSettings': 'Camera Location Settings',
    'report.enableLocation': 'Enable Location: Go to Camera Settings → Location → ON',
    'report.allowLocation': 'Allow Location Access: Grant permission when prompted',
    'report.compatibleApps': 'Use Compatible Apps: Native camera apps work best',
    'report.checkExif': 'Check EXIF: Some apps strip location data for privacy',
    'report.imagePreview': 'Image Preview:',
    'report.locationData': 'Location Data',
    'report.detectLocation': 'Detect My Location',
    'report.locationDetected': 'Location detected',
    'report.fromPhoto': 'from photo',
    'report.fromGPS': 'from GPS',
    'report.noLocationData': 'No location data detected. Please use "Detect My Location" or ensure your photo has GPS data.',
    'report.additionalInfo': 'Additional Information (for better AI analysis)',
    'report.duration': 'How long has this issue existed?',
    'report.durationPlaceholder': 'Select duration',
    'report.severity': 'Severity level?',
    'report.severityPlaceholder': 'Select severity',
    'report.affectedArea': 'Who is affected?',
    'report.affectedAreaPlaceholder': 'Select affected area',
    'report.generateAI': 'Generate AI Description',
    'report.generatingAI': 'Generating AI Description...',
    'report.aiGenerated': 'AI-Generated Professional Report',
    'report.reportTitle': 'Report Title',
    'report.detailedReport': 'Detailed Report',
    'report.reportTags': 'Report Tags',
    'report.submitReport': 'Submit Report',
    'report.submittingReport': 'Submitting Report...',

    // Categories
    'category.pothole': 'Pothole',
    'category.garbage': 'Garbage',
    'category.streetlight': 'Streetlight',
    'category.waterlogging': 'Waterlogging',
    'category.trafficSignal': 'Traffic Signal',
    'category.sidewalk': 'Sidewalk',
    'category.drainage': 'Drainage',
    'category.roadDamage': 'Road Damage',
    'category.other': 'Other',

    // Duration Options
    'duration.justNoticed': 'Just noticed',
    'duration.1day': '1 day',
    'duration.1week': '1 week',
    'duration.2weeks': '2 weeks',
    'duration.1month': '1 month',
    'duration.moreThan1Month': 'More than 1 month',

    // Severity Options
    'severity.low': 'Low',
    'severity.medium': 'Medium',
    'severity.high': 'High',
    'severity.critical': 'Critical',

    // Affected Area Options
    'affected.fewPeople': 'Few people',
    'affected.manyPeople': 'Many people',
    'affected.entireArea': 'Entire area',
    'affected.trafficFlow': 'Traffic flow',
    'affected.pedestriansOnly': 'Pedestrians only',

    // Admin Dashboard
    'admin.dashboard': 'Admin Dashboard',
    'admin.dashboardDesc': 'Manage and prioritize community issues for efficient resolution.',
    'admin.department': 'Department',
    'admin.myDepartmentIssues': 'My Department Issues',
    'admin.otherDepartments': 'Other Departments',
    'admin.citizenReviews': 'Citizen Reviews',
    'admin.criticalIssues': 'Critical Issues',
    'admin.highPriority': 'High Priority',
    'admin.inProgress': 'In Progress',
    'admin.resolved': 'Resolved',
    'admin.searchReports': 'Search reports...',
    'admin.filterByUrgency': 'Filter by urgency',
    'admin.allUrgencyLevels': 'All Urgency Levels',
    'admin.filterByStatus': 'Filter by status',
    'admin.allStatus': 'All Status',
    'admin.communityReports': 'Community Reports',
    'admin.reportsSortedBy': 'Reports sorted by AI-powered urgency ranking',
    'admin.reportCreated': 'Report Created',
    'admin.daysPassed': 'Days Passed',
    'admin.reportDetails': 'Report Details',
    'admin.quickInfo': 'Quick Info',
    'admin.score': 'Score',
    'admin.fullReportDetails': 'Full Report Details',
    'admin.clickToExpand': 'Click to expand',
    'admin.clickToCollapse': 'Click to collapse',
    'admin.photoEvidence': 'Photo Evidence',
    'admin.imageCouldNotBeLoaded': 'Image could not be loaded',
    'admin.reportDeletedByCitizen': 'Report Deleted by Citizen',
    'admin.reason': 'Reason',
    'admin.deletedOn': 'Deleted on',
    'admin.note': 'Note',
    'admin.reportTakenBack': 'This report has been taken back by the citizen. No further actions can be taken.',
    'admin.updateStatus': 'Update Status',
    'admin.noActionsAvailable': 'No Actions Available',
    'admin.direct': 'Direct',

    // Status
    'status.reported': 'Reported',
    'status.acknowledged': 'Acknowledged',
    'status.inProgress': 'In Progress',
    'status.resolved': 'Resolved',
    'status.deleted': 'Deleted',

    // Track Reports
    'track.title': 'Track Your Reports',
    'track.description': 'Monitor the status of your submitted reports and communicate with administrators.',

    // Community Feed
    'community.title': 'Community Reports',
    'community.description': 'Explore issues reported by citizens in your area. Upvote and comment to help prioritize.',

    // Messages
    'message.invalidFileType': 'Invalid file type',
    'message.selectImageFile': 'Please select an image file.',
    'message.fileTooLarge': 'File too large',
    'message.selectSmallerImage': 'Please select an image smaller than 10MB.',
    'message.locationDetected': 'Location detected',
    'message.gpsCoordinatesFound': 'GPS coordinates found in image',
    'message.noLocationDataInPhoto': 'No location data in photo',
    'message.locationGuidance': 'To capture location in photos: 1) Enable location in camera settings, 2) Allow location access when prompted, 3) Use a camera app that preserves EXIF data',
    'message.locationDetectionFailed': 'Location detection failed',
    'message.couldNotDetectLocation': 'Could not detect location from image or GPS. Please use the "Detect My Location" button or manually set location.',
    'message.currentLocation': 'Current location',
    'message.couldNotAccessLocation': 'Could not access your location. Please check your browser permissions.',
    'message.missingInformation': 'Missing information',
    'message.selectCategoryAndLocation': 'Please select a category and ensure location is detected.',
    'message.aiDescriptionGenerated': 'AI Description Generated',
    'message.aiAnalyzedReport': 'AI has analyzed your report and generated an optimized description.',
    'message.aiGenerationFailed': 'AI Generation Failed',
    'message.couldNotGenerateAI': 'Could not generate AI description. Please try again.',
    'message.incompleteReport': 'Incomplete report',
    'message.fillAllFields': 'Please fill in all required fields and generate AI description.',
    'message.reportSubmittedSuccessfully': 'Report Submitted Successfully',
    'message.reportSubmittedForReview': 'Your report has been submitted and will be reviewed by administrators.',
    'message.issueAlreadyReported': 'This issue has already been reported.',
    'message.foundExistingReport': 'We found an existing report within 30 meters.',
    'message.viewExistingReport': 'View Existing Report',
    'message.submissionFailed': 'Submission Failed',
    'message.errorSubmittingReport': 'There was an error submitting your report. Please try again.',
    'message.error': 'Error',
    'message.failedToLoadData': 'Failed to load data',
    'message.success': 'Success',
    'message.reportsRefreshed': 'Reports refreshed successfully',
    'message.failedToRefreshReports': 'Failed to refresh reports',
    'message.statusUpdated': 'Status Updated',
    'message.reportStatusUpdated': 'Report status updated to',
    'message.reportResolvedDirectly': 'Report resolved directly - requirements were fulfilled',
    'message.failedToResolveReport': 'Failed to resolve report directly',
    'message.loadingReports': 'Loading reports...',
    'message.loadingCrowdCare': 'Loading CrowdCare...'
  },
  hi: {
    // Common
    'common.loading': 'लोड हो रहा है...',
    'common.cancel': 'रद्द करें',
    'common.submit': 'जमा करें',
    'common.close': 'बंद करें',
    'common.save': 'सहेजें',
    'common.edit': 'संपादित करें',
    'common.delete': 'हटाएं',
    'common.view': 'देखें',
    'common.refresh': 'ताज़ा करें',
    'common.search': 'खोजें',
    'common.filter': 'फ़िल्टर',
    'common.actions': 'कार्य',
    'common.status': 'स्थिति',
    'common.date': 'तारीख',
    'common.time': 'समय',
    'common.location': 'स्थान',
    'common.category': 'श्रेणी',
    'common.description': 'विवरण',
    'common.title': 'शीर्षक',
    'common.reporter': 'रिपोर्टर',
    'common.urgency': 'तात्कालिकता',
    'common.logout': 'लॉग आउट',
    'common.exit': 'बाहर निकलें',
    'common.language': 'भाषा',
    'common.english': 'English',
    'common.hindi': 'हिंदी',

    // Landing Page
    'landing.title': 'CrowdCare',
    'landing.subtitle': 'AI-संचालित अंतर्दृष्टि के माध्यम से स्थानीय मुद्दों की रिपोर्ट करने और हल करने के लिए समुदायों को सशक्त बनाना',
    'landing.chooseRole': 'अपनी भूमिका चुनें',
    'landing.roleDescription': 'अपने समुदाय को बेहतर बनाने में भाग लेने का तरीका चुनें',
    'landing.citizen': 'नागरिक',
    'landing.citizenDescription': 'अपने समुदाय में मुद्दों की रिपोर्ट करें और उनके समाधान को ट्रैक करें',
    'landing.admin': 'प्रशासक',
    'landing.adminDescription': 'कुशल समाधान के लिए समुदाय के मुद्दों का प्रबंधन और प्राथमिकता दें',
    'landing.continueAsCitizen': 'नागरिक के रूप में जारी रखें',
    'landing.continueAsAdmin': 'प्रशासक के रूप में जारी रखें',
    'landing.howItWorks': 'CrowdCare कैसे काम करता है',
    'landing.step1': 'मुद्दों की रिपोर्ट करें',
    'landing.step1Desc': 'नागरिक स्वचालित GPS स्थान और AI-जेनरेटेड विवरण के साथ तस्वीरें कैप्चर करते हैं',
    'landing.step2': 'AI विश्लेषण',
    'landing.step2Desc': 'हमारा AI तात्कालिकता निर्धारित करने और क्रियात्मक अंतर्दृष्टि उत्पन्न करने के लिए रिपोर्टों का विश्लेषण करता है',
    'landing.step3': 'समाधान',
    'landing.step3Desc': 'प्रशासक कुशल समुदाय सुधार के लिए मुद्दों को प्राथमिकता देते हैं और प्रबंधित करते हैं',

    // Citizen Features
    'citizen.reportWithPhotos': 'तस्वीरों के साथ स्थानीय मुद्दों की रिपोर्ट करें',
    'citizen.gpsDetection': 'स्वचालित GPS स्थान पहचान',
    'citizen.aiDescriptions': 'AI-संचालित मुद्दा विवरण',
    'citizen.trackProgress': 'मुद्दा समाधान प्रगति को ट्रैक करें',
    'citizen.urgencyRanking': 'AI-संचालित तात्कालिकता रैंकिंग',
    'citizen.advancedFiltering': 'उन्नत फ़िल्टरिंग और सॉर्टिंग',
    'citizen.resolutionManagement': 'मुद्दा समाधान प्रबंधन',
    'citizen.communityInsights': 'समुदाय अंतर्दृष्टि और रिपोर्ट',

    // Citizen Dashboard
    'citizen.welcome': 'CrowdCare में आपका स्वागत है',
    'citizen.welcomeDesc': 'मुद्दों की रिपोर्ट करके और उनके समाधान को ट्रैक करके अपने समुदाय को बेहतर बनाने में मदद करें।',
    'citizen.dashboard': 'नागरिक डैशबोर्ड',
    'citizen.reportIssue': 'मुद्दा रिपोर्ट करें',
    'citizen.reportIssueDesc': 'AI-संचालित विवरण के साथ स्थानीय मुद्दों की रिपोर्ट करें',
    'citizen.trackReports': 'रिपोर्ट ट्रैक करें',
    'citizen.trackReportsDesc': 'अपनी जमा की गई रिपोर्टों की स्थिति की निगरानी करें',
    'citizen.community': 'समुदाय',
    'citizen.communityDesc': 'अन्य नागरिकों द्वारा रिपोर्ट किए गए मुद्दों को देखें',

    // Report Form
    'report.title': 'मुद्दा रिपोर्ट करें',
    'report.description': 'AI-संचालित विवरण और स्वचालित स्थान पहचान के साथ स्थानीय मुद्दों की रिपोर्ट करें।',
    'report.category': 'श्रेणी',
    'report.categoryPlaceholder': 'मुद्दा श्रेणी चुनें',
    'report.photo': 'तस्वीर',
    'report.cameraSettings': 'कैमरा स्थान सेटिंग्स',
    'report.enableLocation': 'स्थान सक्षम करें: कैमरा सेटिंग्स → स्थान → ON पर जाएं',
    'report.allowLocation': 'स्थान पहुंच की अनुमति दें: संकेत मिलने पर अनुमति दें',
    'report.compatibleApps': 'संगत ऐप्स का उपयोग करें: मूल कैमरा ऐप्स सबसे अच्छे काम करते हैं',
    'report.checkExif': 'EXIF जांचें: कुछ ऐप्स गोपनीयता के लिए स्थान डेटा हटा देते हैं',
    'report.imagePreview': 'छवि पूर्वावलोकन:',
    'report.locationData': 'स्थान डेटा',
    'report.detectLocation': 'मेरा स्थान पहचानें',
    'report.locationDetected': 'स्थान पहचाना गया',
    'report.fromPhoto': 'तस्वीर से',
    'report.fromGPS': 'GPS से',
    'report.noLocationData': 'कोई स्थान डेटा पहचाना नहीं गया। कृपया "मेरा स्थान पहचानें" का उपयोग करें या सुनिश्चित करें कि आपकी तस्वीर में GPS डेटा है।',
    'report.additionalInfo': 'अतिरिक्त जानकारी (बेहतर AI विश्लेषण के लिए)',
    'report.duration': 'यह मुद्दा कितने समय से मौजूद है?',
    'report.durationPlaceholder': 'अवधि चुनें',
    'report.severity': 'गंभीरता स्तर?',
    'report.severityPlaceholder': 'गंभीरता चुनें',
    'report.affectedArea': 'कौन प्रभावित है?',
    'report.affectedAreaPlaceholder': 'प्रभावित क्षेत्र चुनें',
    'report.generateAI': 'AI विवरण उत्पन्न करें',
    'report.generatingAI': 'AI विवरण उत्पन्न हो रहा है...',
    'report.aiGenerated': 'AI-जेनरेटेड पेशेवर रिपोर्ट',
    'report.reportTitle': 'रिपोर्ट शीर्षक',
    'report.detailedReport': 'विस्तृत रिपोर्ट',
    'report.reportTags': 'रिपोर्ट टैग',
    'report.submitReport': 'रिपोर्ट जमा करें',
    'report.submittingReport': 'रिपोर्ट जमा हो रही है...',

    // Categories
    'category.pothole': 'गड्ढा',
    'category.garbage': 'कचरा',
    'category.streetlight': 'स्ट्रीटलाइट',
    'category.waterlogging': 'जलभराव',
    'category.trafficSignal': 'ट्रैफिक सिग्नल',
    'category.sidewalk': 'फुटपाथ',
    'category.drainage': 'नाली',
    'category.roadDamage': 'सड़क क्षति',
    'category.other': 'अन्य',

    // Duration Options
    'duration.justNoticed': 'अभी देखा',
    'duration.1day': '1 दिन',
    'duration.1week': '1 सप्ताह',
    'duration.2weeks': '2 सप्ताह',
    'duration.1month': '1 महीना',
    'duration.moreThan1Month': '1 महीने से अधिक',

    // Severity Options
    'severity.low': 'कम',
    'severity.medium': 'मध्यम',
    'severity.high': 'उच्च',
    'severity.critical': 'गंभीर',

    // Affected Area Options
    'affected.fewPeople': 'कुछ लोग',
    'affected.manyPeople': 'कई लोग',
    'affected.entireArea': 'पूरा क्षेत्र',
    'affected.trafficFlow': 'ट्रैफिक प्रवाह',
    'affected.pedestriansOnly': 'केवल पैदल चलने वाले',

    // Admin Dashboard
    'admin.dashboard': 'प्रशासक डैशबोर्ड',
    'admin.dashboardDesc': 'कुशल समाधान के लिए समुदाय के मुद्दों का प्रबंधन और प्राथमिकता दें।',
    'admin.department': 'विभाग',
    'admin.myDepartmentIssues': 'मेरे विभाग के मुद्दे',
    'admin.otherDepartments': 'अन्य विभाग',
    'admin.citizenReviews': 'नागरिक समीक्षाएं',
    'admin.criticalIssues': 'गंभीर मुद्दे',
    'admin.highPriority': 'उच्च प्राथमिकता',
    'admin.inProgress': 'प्रगति में',
    'admin.resolved': 'हल किया गया',
    'admin.searchReports': 'रिपोर्ट खोजें...',
    'admin.filterByUrgency': 'तात्कालिकता के अनुसार फ़िल्टर करें',
    'admin.allUrgencyLevels': 'सभी तात्कालिकता स्तर',
    'admin.filterByStatus': 'स्थिति के अनुसार फ़िल्टर करें',
    'admin.allStatus': 'सभी स्थिति',
    'admin.communityReports': 'समुदाय रिपोर्ट',
    'admin.reportsSortedBy': 'AI-संचालित तात्कालिकता रैंकिंग के अनुसार क्रमबद्ध रिपोर्ट',
    'admin.reportCreated': 'रिपोर्ट बनाई गई',
    'admin.daysPassed': 'दिन बीते',
    'admin.reportDetails': 'रिपोर्ट विवरण',
    'admin.quickInfo': 'त्वरित जानकारी',
    'admin.score': 'स्कोर',
    'admin.fullReportDetails': 'पूर्ण रिपोर्ट विवरण',
    'admin.clickToExpand': 'विस्तार करने के लिए क्लिक करें',
    'admin.clickToCollapse': 'संकुचित करने के लिए क्लिक करें',
    'admin.photoEvidence': 'फोटो साक्ष्य',
    'admin.imageCouldNotBeLoaded': 'छवि लोड नहीं हो सकी',
    'admin.reportDeletedByCitizen': 'नागरिक द्वारा रिपोर्ट हटाई गई',
    'admin.reason': 'कारण',
    'admin.deletedOn': 'हटाया गया',
    'admin.note': 'नोट',
    'admin.reportTakenBack': 'यह रिपोर्ट नागरिक द्वारा वापस ले ली गई है। कोई और कार्य नहीं किया जा सकता।',
    'admin.updateStatus': 'स्थिति अपडेट करें',
    'admin.noActionsAvailable': 'कोई कार्य उपलब्ध नहीं',
    'admin.direct': 'प्रत्यक्ष',

    // Status
    'status.reported': 'रिपोर्ट किया गया',
    'status.acknowledged': 'स्वीकृत',
    'status.inProgress': 'प्रगति में',
    'status.resolved': 'हल किया गया',
    'status.deleted': 'हटाया गया',

    // Track Reports
    'track.title': 'अपनी रिपोर्ट ट्रैक करें',
    'track.description': 'अपनी जमा की गई रिपोर्टों की स्थिति की निगरानी करें और प्रशासकों के साथ संवाद करें।',

    // Community Feed
    'community.title': 'समुदाय रिपोर्ट',
    'community.description': 'अपने क्षेत्र में नागरिकों द्वारा रिपोर्ट किए गए मुद्दों का अन्वेषण करें। प्राथमिकता देने में मदद के लिए वोट करें और टिप्पणी करें।',

    // Messages
    'message.invalidFileType': 'अमान्य फ़ाइल प्रकार',
    'message.selectImageFile': 'कृपया एक छवि फ़ाइल चुनें।',
    'message.fileTooLarge': 'फ़ाइल बहुत बड़ी',
    'message.selectSmallerImage': 'कृपया 10MB से छोटी छवि चुनें।',
    'message.locationDetected': 'स्थान पहचाना गया',
    'message.gpsCoordinatesFound': 'छवि में GPS निर्देशांक मिले',
    'message.noLocationDataInPhoto': 'फोटो में कोई स्थान डेटा नहीं',
    'message.locationGuidance': 'फोटो में स्थान कैप्चर करने के लिए: 1) कैमरा सेटिंग्स में स्थान सक्षम करें, 2) संकेत मिलने पर स्थान पहुंच की अनुमति दें, 3) ऐसा कैमरा ऐप उपयोग करें जो EXIF डेटा संरक्षित करता हो',
    'message.locationDetectionFailed': 'स्थान पहचान विफल',
    'message.couldNotDetectLocation': 'छवि या GPS से स्थान का पता नहीं लगाया जा सका। कृपया "मेरा स्थान पहचानें" बटन का उपयोग करें या मैन्युअल रूप से स्थान सेट करें।',
    'message.currentLocation': 'वर्तमान स्थान',
    'message.couldNotAccessLocation': 'आपके स्थान तक पहुंच नहीं बन सकी। कृपया अपनी ब्राउज़र अनुमतियों की जांच करें।',
    'message.missingInformation': 'जानकारी गुम',
    'message.selectCategoryAndLocation': 'कृपया एक श्रेणी चुनें और सुनिश्चित करें कि स्थान पहचाना गया है।',
    'message.aiDescriptionGenerated': 'AI विवरण उत्पन्न किया गया',
    'message.aiAnalyzedReport': 'AI ने आपकी रिपोर्ट का विश्लेषण किया है और एक अनुकूलित विवरण उत्पन्न किया है।',
    'message.aiGenerationFailed': 'AI उत्पादन विफल',
    'message.couldNotGenerateAI': 'AI विवरण उत्पन्न नहीं किया जा सका। कृपया फिर से कोशिश करें।',
    'message.incompleteReport': 'अधूरी रिपोर्ट',
    'message.fillAllFields': 'कृपया सभी आवश्यक फ़ील्ड भरें और AI विवरण उत्पन्न करें।',
    'message.reportSubmittedSuccessfully': 'रिपोर्ट सफलतापूर्वक जमा की गई',
    'message.reportSubmittedForReview': 'आपकी रिपोर्ट जमा की गई है और प्रशासकों द्वारा समीक्षा की जाएगी।',
    'message.issueAlreadyReported': 'यह मुद्दा पहले से रिपोर्ट किया गया है।',
    'message.foundExistingReport': 'हमें 30 मीटर के भीतर एक मौजूदा रिपोर्ट मिली।',
    'message.viewExistingReport': 'मौजूदा रिपोर्ट देखें',
    'message.submissionFailed': 'जमा करना विफल',
    'message.errorSubmittingReport': 'आपकी रिपोर्ट जमा करने में त्रुटि हुई। कृपया फिर से कोशिश करें।',
    'message.error': 'त्रुटि',
    'message.failedToLoadData': 'डेटा लोड करने में विफल',
    'message.success': 'सफलता',
    'message.reportsRefreshed': 'रिपोर्ट सफलतापूर्वक ताज़ा की गईं',
    'message.failedToRefreshReports': 'रिपोर्ट ताज़ा करने में विफल',
    'message.statusUpdated': 'स्थिति अपडेट की गई',
    'message.reportStatusUpdated': 'रिपोर्ट स्थिति अपडेट की गई',
    'message.reportResolvedDirectly': 'रिपोर्ट प्रत्यक्ष रूप से हल की गई - आवश्यकताएं पूरी हुईं',
    'message.failedToResolveReport': 'रिपोर्ट को प्रत्यक्ष रूप से हल करने में विफल',
    'message.loadingReports': 'रिपोर्ट लोड हो रही हैं...',
    'message.loadingCrowdCare': 'CrowdCare लोड हो रहा है...'
  }
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Get language from localStorage or default to English
    const savedLanguage = localStorage.getItem('crowdcare-language') as Language;
    return savedLanguage || 'en';
  });

  // Save language to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('crowdcare-language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
