import { PrismaClient, Role, CourseLevel, CourseStatus, EnrollmentStatus, AttendanceStatus, SubmissionStatus, ResultType, TargetRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting LMS Database Seeding...');

  // 1. Create Categories
  const categories = [
    { name: 'Web Development', slug: 'web-development', description: 'Master front-end, back-end, and full-stack engineering technologies.' },
    { name: 'Data Science & AI', slug: 'data-science-ai', description: 'Explore machine learning, deep learning, Python, and data analysis.' },
    { name: 'Mobile App Development', slug: 'mobile-app-development', description: 'Build native and cross-platform mobile apps for iOS and Android.' },
    { name: 'UI/UX Design', slug: 'ui-ux-design', description: 'Design modern user interfaces and intuitive digital product experiences.' },
    { name: 'Cloud & DevOps', slug: 'cloud-devops', description: 'Deploy, scale, and manage containerized applications with Docker, Kubernetes, and Cloud providers.' },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categories) {
    const c = await prisma.courseCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categoryMap[cat.slug] = c.id;
  }
  console.log('✔ Course Categories created');

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
      phone: '+1 800 555 0100',
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
      firstName: 'Sarah',
      lastName: 'Jenkins',
      role: Role.TEACHER,
      phone: '+1 800 555 0101',
      teacherProfile: {
        create: {
          employeeId: 'TCH-1001',
          qualification: 'M.Sc. Computer Science, Stanford University',
          specialization: 'Full-Stack Architecture & Cloud Systems',
          bio: 'Lead software engineer and instructor with 12+ years of industry experience teaching full-stack web and cloud systems.',
        },
      },
    },
    include: { teacherProfile: true },
  });
  console.log('✔ Teacher created: teacher@lms.local');

  // 5. Students
  const student1 = await prisma.user.upsert({
    where: { email: 'student@lms.local' },
    update: {},
    create: {
      email: 'student@lms.local',
      passwordHash: studentPass,
      firstName: 'Alex',
      lastName: 'Carter',
      role: Role.STUDENT,
      phone: '+1 800 555 0201',
      studentProfile: {
        create: {
          studentIdNumber: 'STU-2001',
          gradeLevel: 'Undergraduate Year 2',
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
      firstName: 'Maya',
      lastName: 'Lin',
      role: Role.STUDENT,
      phone: '+1 800 555 0202',
      studentProfile: {
        create: {
          studentIdNumber: 'STU-2002',
          gradeLevel: 'Undergraduate Year 3',
        },
      },
    },
    include: { studentProfile: true },
  });
  console.log('✔ Students created: student@lms.local, student2@lms.local');

  // 6. Courses
  const teacherId = teacherUser.teacherProfile!.id;
  const course1 = await prisma.course.upsert({
    where: { slug: 'full-stack-web-development-react-node' },
    update: {},
    create: {
      title: 'Full-Stack Web Development with React & Node.js',
      slug: 'full-stack-web-development-react-node',
      shortDescription: 'Master modern full-stack development building end-to-end applications from scratch.',
      description: 'Comprehensive curriculum covering HTML5, CSS3, modern JavaScript ES6+, TypeScript, React 18, Next.js, Node.js, Express, MySQL, and Prisma ORM. Build production-grade web applications with authentication, security best practices, and robust API design.',
      price: 49.99,
      level: CourseLevel.BEGINNER,
      status: CourseStatus.PUBLISHED,
      thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
      categoryId: categoryMap['web-development'],
      teacherId,
      modules: {
        create: [
          {
            title: 'Module 1: Foundations of Modern Web Development',
            description: 'Core concepts of internet architecture, HTTP protocol, HTML semantic layout, and modern CSS.',
            orderIndex: 0,
            lessons: {
              create: [
                {
                  title: '1.1 How the Web Works: HTTP, DNS & Browsers',
                  content: 'Understanding client-server models, request-response lifecycles, and modern rendering engines.',
                  videoUrl: 'https://www.youtube.com/watch?v=iYM2zFP3Zn0',
                  durationMinutes: 25,
                  orderIndex: 0,
                  isFreePreview: true,
                },
                {
                  title: '1.2 Modern CSS Architecture: Tailwind & Responsive Design',
                  content: 'Learn modern utility-first styling with Tailwind CSS, Flexbox, and CSS Grid layout algorithms.',
                  videoUrl: 'https://www.youtube.com/watch?v=ft30zcMlFao',
                  durationMinutes: 35,
                  orderIndex: 1,
                  isFreePreview: true,
                },
              ],
            },
          },
          {
            title: 'Module 2: TypeScript & Modern JavaScript',
            description: 'Type systems, generics, async/await, and modern ESNext features for scalable codebases.',
            orderIndex: 1,
            lessons: {
              create: [
                {
                  title: '2.1 Essential TypeScript for Professional Engineers',
                  content: 'Static typing, interfaces, type narrowing, and strict configuration in modern development.',
                  videoUrl: 'https://www.youtube.com/watch?v=BwuLxPH8IDs',
                  durationMinutes: 40,
                  orderIndex: 0,
                  isFreePreview: false,
                },
                {
                  title: '2.2 Asynchronous JavaScript & Promises',
                  content: 'Deep dive into event loop, microtasks, callbacks, Promises, and async/await syntax.',
                  durationMinutes: 30,
                  orderIndex: 1,
                  isFreePreview: false,
                },
              ],
            },
          },
        ],
      },
      assignments: {
        create: [
          {
            title: 'Assignment 1: Responsive Portfolio Landing Page',
            description: 'Build a responsive personal portfolio using semantic HTML, Tailwind CSS, and TypeScript. Submit your GitHub repository link and deployed URL.',
            maxScore: 100,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days ahead
          },
        ],
      },
      quizzes: {
        create: [
          {
            title: 'Web Foundations & TypeScript Quiz',
            description: 'Test your understanding of HTTP, CSS layouts, and TypeScript fundamentals.',
            timeLimitMinutes: 20,
            passingScore: 60,
            isPublished: true,
            questions: {
              create: [
                {
                  text: 'Which HTTP status code signifies that a resource was successfully created?',
                  points: 10,
                  orderIndex: 0,
                  options: {
                    create: [
                      { text: '200 OK', isCorrect: false, orderIndex: 0 },
                      { text: '201 Created', isCorrect: true, orderIndex: 1 },
                      { text: '204 No Content', isCorrect: false, orderIndex: 2 },
                      { text: '400 Bad Request', isCorrect: false, orderIndex: 3 },
                    ],
                  },
                },
                {
                  text: 'What is the purpose of TypeScript interfaces?',
                  points: 10,
                  orderIndex: 1,
                  options: {
                    create: [
                      { text: 'To define the structural shape and contract of objects', isCorrect: true, orderIndex: 0 },
                      { text: 'To run JavaScript code faster at runtime', isCorrect: false, orderIndex: 1 },
                      { text: 'To connect directly to databases', isCorrect: false, orderIndex: 2 },
                      { text: 'To encrypt network payloads', isCorrect: false, orderIndex: 3 },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  const course2 = await prisma.course.upsert({
    where: { slug: 'modern-python-data-science-machine-learning' },
    update: {},
    create: {
      title: 'Modern Python for Data Science and Machine Learning',
      slug: 'modern-python-data-science-machine-learning',
      shortDescription: 'Master Python, NumPy, Pandas, visualization, and machine learning model development.',
      description: 'Hands-on journey through data manipulation, exploratory analysis, linear algebra foundations, Scikit-Learn pipelines, and model deployment.',
      price: 39.99,
      level: CourseLevel.INTERMEDIATE,
      status: CourseStatus.PUBLISHED,
      thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80',
      categoryId: categoryMap['data-science-ai'],
      teacherId,
    },
  });
  console.log('✔ Courses, Modules, Lessons, Assignments, and Quizzes seeded');

  // 7. Enroll Student 1 in Course 1
  const studentProfileId = student1.studentProfile!.id;
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

  // 8. Welcome Announcement
  await prisma.announcement.create({
    data: {
      title: 'Welcome to the New Academic Semester!',
      content: 'We are thrilled to welcome all students and instructors to our brand new, high-performance Learning Management System. Check your course syllabus and assignments.',
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
