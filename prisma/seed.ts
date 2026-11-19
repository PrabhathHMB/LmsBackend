import {
  PrismaClient,
  Role,
  CourseLevel,
  CourseStatus,
  EnrollmentStatus,
  AttendanceStatus,
  SubmissionStatus,
  ResultType,
  TargetRole,
  FeePaymentStatus,
  PaymentMethod,
  SessionType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting LMS Database Seeding...');

  // 1. Create Categories (including Sri Lankan Secondary & A/L grades with tuition fee tiers)
  const categories = [
    { name: 'Grade 10 Mathematics', slug: 'grade-10-mathematics', description: 'Comprehensive O/L Grade 10 syllabus with geometry, algebra, and statistics.', defaultMonthlyFee: 2500.0 },
    { name: 'Grade 11 O/L Mathematics', slug: 'grade-11-ol-mathematics', description: 'Complete General Certificate of Education Ordinary Level mathematics masterclass.', defaultMonthlyFee: 2500.0 },
    { name: 'A/L Science for Technology (SFT)', slug: 'al-science-for-technology', description: 'Advanced Level Technology stream core subject - Science for Technology.', defaultMonthlyFee: 3500.0 },
    { name: 'Full-Stack Web Development', slug: 'web-development', description: 'Master front-end, back-end, and full-stack engineering technologies.', defaultMonthlyFee: 4000.0 },
    { name: 'Data Science & Machine Learning', slug: 'data-science-ai', description: 'Explore machine learning, deep learning, Python, and data analysis.', defaultMonthlyFee: 4500.0 },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categories) {
    const c = await prisma.courseCategory.upsert({
      where: { slug: cat.slug },
      update: { defaultMonthlyFee: cat.defaultMonthlyFee },
      create: cat,
    });
    categoryMap[cat.slug] = c.id;
  }
  console.log('✔ Course Categories created with default monthly tuition fees');

  // 2. Passwords
  const adminPass = await bcrypt.hash('Admin123!', 10);
  const teacherPass = await bcrypt.hash('Teacher123!', 10);
  const studentPass = await bcrypt.hash('Student123!', 10);

  // 3. Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lms.local' },
    update: {},
    create: {
      email: 'admin@lms.local',
      passwordHash: adminPass,
      firstName: 'Admin',
      lastName: 'Director',
      role: Role.ADMIN,
      phone: '+94 77 123 4567',
    },
  });
  console.log('✔ Admin user created: admin@lms.local');

  // 4. Teacher User & Profile
  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@lms.local' },
    update: {},
    create: {
      email: 'teacher@lms.local',
      passwordHash: teacherPass,
      firstName: 'Kavinda',
      lastName: 'Perera',
      role: Role.TEACHER,
      phone: '+94 71 987 6543',
      teacherProfile: {
        create: {
          employeeId: 'TCH-1001',
          qualification: 'B.Sc. (Hons) Engineering, University of Moratuwa',
          specialization: 'Secondary Mathematics & Science for Technology',
          bio: 'Senior educator with over 10 years of experience coaching island top rankers in O/L Mathematics and A/L Science for Technology.',
        },
      },
    },
    include: { teacherProfile: true },
  });
  console.log('✔ Teacher created: teacher@lms.local');

  // 5. Students with Sri Lankan Contact Details and Grade Allocation
  const student1 = await prisma.user.upsert({
    where: { email: 'student@lms.local' },
    update: {},
    create: {
      email: 'student@lms.local',
      passwordHash: studentPass,
      firstName: 'Alex',
      lastName: 'Fernando',
      role: Role.STUDENT,
      phone: '+94 76 111 2233',
      studentProfile: {
        create: {
          studentIdNumber: 'STU-2001',
          gradeLevel: 'Grade 11',
          studentPhone: '+94 76 111 2233',
          parentPhone: '+94 77 444 5566',
          address: 'No 45, Temple Road, Colombo 03, Sri Lanka',
          assignedGradeId: categoryMap['grade-11-ol-mathematics'],
        },
      },
    },
    include: { studentProfile: true },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@lms.local' },
    update: {},
    create: {
      email: 'student2@lms.local',
      passwordHash: studentPass,
      firstName: 'Nethmi',
      lastName: 'Silva',
      role: Role.STUDENT,
      phone: '+94 72 333 4455',
      studentProfile: {
        create: {
          studentIdNumber: 'STU-2002',
          gradeLevel: 'Grade 11',
          studentPhone: '+94 72 333 4455',
          parentPhone: '+94 71 888 9900',
          address: 'No 12/A, Galle Road, Panadura, Sri Lanka',
          assignedGradeId: categoryMap['grade-11-ol-mathematics'],
        },
      },
    },
    include: { studentProfile: true },
  });
  console.log('✔ Students created with Grade Allocation and Parent Contact info');

  const teacherId = teacherUser.teacherProfile!.id;
  const studentProfileId = student1.studentProfile!.id;

  // 6. Courses
  const course1 = await prisma.course.upsert({
    where: { slug: 'grade-11-ol-mathematics-mastery' },
    update: {},
    create: {
      title: 'Grade 11 O/L Mathematics Complete Masterclass',
      slug: 'grade-11-ol-mathematics-mastery',
      shortDescription: 'Master the entire O/L Mathematics syllabus with theory, theorems, and past paper analysis.',
      description: 'Comprehensive study program tailored for students sitting for the G.C.E. Ordinary Level examinations. Covers quadratic equations, trigonometry, progressions, circle theorems, and probability.',
      price: 2500.0,
      currency: 'LKR',
      level: CourseLevel.INTERMEDIATE,
      status: CourseStatus.PUBLISHED,
      thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80',
      categoryId: categoryMap['grade-11-ol-mathematics'],
      teacherId,
      modules: {
        create: [
          {
            title: 'Module 1: Quadratic Equations & Functions',
            orderIndex: 0,
            lessons: {
              create: [
                {
                  title: '1.1 Solving Quadratic Equations by Factoring',
                  content: 'Comprehensive lesson on finding roots of quadratic equations through factor decomposition.',
                  videoUrl: 'https://www.youtube.com/watch?v=zqL_Vv7_7gM',
                  duration: 45,
                  orderIndex: 0,
                  isFree: true,
                },
                {
                  title: '1.2 Quadratic Formula & Completing the Square',
                  content: 'Step-by-step derivation and application of the quadratic formula.',
                  videoUrl: 'https://www.youtube.com/watch?v=EeVrL1xM1wM',
                  duration: 50,
                  orderIndex: 1,
                  isFree: false,
                },
              ],
            },
          },
          {
            title: 'Module 2: Circle Theorems & Geometric Proofs',
            orderIndex: 1,
            lessons: {
              create: [
                {
                  title: '2.1 Angles in the Same Segment & Central Angles',
                  content: 'Understanding foundational theorems regarding angles subtended by arcs at the circumference.',
                  videoUrl: 'https://www.youtube.com/watch?v=1F5d_0TqP4I',
                  duration: 40,
                  orderIndex: 0,
                  isFree: false,
                },
              ],
            },
          },
        ],
      },
    },
  });

  // 7. Enroll Student 1 in Course 1
  await prisma.enrollment.upsert({
    where: {
      studentId_courseId: {
        studentId: studentProfileId,
        courseId: course1.id,
      },
    },
    update: {},
    create: {
      studentId: studentProfileId,
      courseId: course1.id,
      status: EnrollmentStatus.ACTIVE,
    },
  });

  // 8. Class Sessions & Batch Attendance
  const sessionDate = new Date();
  sessionDate.setHours(0, 0, 0, 0);

  const session = await prisma.classSession.create({
    data: {
      gradeId: categoryMap['grade-11-ol-mathematics'],
      title: 'Week 3: Quadratic Functions & Past Papers Seminar',
      description: 'Physical class session held in Hall A and streamed live for online students.',
      sessionDate,
      sessionType: SessionType.HYBRID,
      attendances: {
        create: [
          {
            studentId: studentProfileId,
            sessionDate,
            status: AttendanceStatus.PRESENT,
            remarks: 'Attended physically and submitted homework booklet.',
          },
        ],
      },
    },
  });
  console.log('✔ Class Session and Attendance record created');

  // 9. Monthly Tuition Fee Records
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  await prisma.feeRecord.upsert({
    where: {
      studentId_year_month: {
        studentId: studentProfileId,
        year: currentYear,
        month: currentMonth,
      },
    },
    update: {},
    create: {
      studentId: studentProfileId,
      gradeId: categoryMap['grade-11-ol-mathematics'],
      year: currentYear,
      month: currentMonth,
      feeAmount: 2500.0,
      paidAmount: 2500.0,
      status: FeePaymentStatus.PAID,
      paymentMethod: PaymentMethod.CASH,
      receiptNumber: `REC-${currentYear}${String(currentMonth).padStart(2, '0')}-1098`,
      paidAt: new Date(),
      note: 'Tuition paid in person at main reception desk.',
    },
  });
  console.log('✔ Tuition Fee Record created with Receipt Number');

  // 10. Sample Certificate for Alex Fernando
  const certCode = 'CERT-MATH-2026-X7K9';
  await prisma.certificate.upsert({
    where: { certificateCode: certCode },
    update: {},
    create: {
      certificateCode: certCode,
      studentId: studentProfileId,
      courseId: course1.id,
      grade: 'DISTINCTION',
    },
  });
  console.log(`✔ Verified Certificate created: Code [${certCode}]`);

  // 11. Welcome Announcement
  await prisma.announcement.create({
    data: {
      title: 'Welcome to the New Academic Session!',
      content: 'We are thrilled to launch the new LMS with monthly fee management, attendance tracking, and verified certificates.',
      targetRole: TargetRole.ALL,
      authorId: admin.id,
    },
  });

  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
